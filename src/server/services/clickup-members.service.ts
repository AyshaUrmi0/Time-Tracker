import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { decrypt } from "@/lib/encryption";
import { fetchClickUpTeamsWithMembers } from "@/lib/clickup/client";
import { handleClickUpInvalidToken } from "@/server/services/clickup-error-handling";
import type { ClickUpMembersSyncResult } from "@/features/clickup/types";
import type { SessionUser } from "@/types";

export const clickupMembersService = {
  async syncMembers(actor: SessionUser): Promise<ClickUpMembersSyncResult> {
    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: {
        accessTokenEncrypted: true,
        encryptionIv: true,
        isActive: true,
      },
    });
    if (!conn || !conn.isActive) {
      throw ApiErrors.conflict(
        "CLICKUP_NOT_CONNECTED",
        "Connect ClickUp first.",
      );
    }

    const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);
    let teams: Awaited<ReturnType<typeof fetchClickUpTeamsWithMembers>>["teams"];
    let members: Awaited<ReturnType<typeof fetchClickUpTeamsWithMembers>>["members"];
    try {
      const result = await fetchClickUpTeamsWithMembers(token);
      teams = result.teams;
      members = result.members;
    } catch (err) {
      await handleClickUpInvalidToken(err, actor.userId);
      throw err;
    }

    const dedupedByClickupId = new Map<number, (typeof members)[number]>();
    for (const m of members) {
      if (!dedupedByClickupId.has(m.clickupUserId)) {
        dedupedByClickupId.set(m.clickupUserId, m);
      }
    }
    const uniqueMembers = Array.from(dedupedByClickupId.values());

    let linked = 0;
    let alreadyLinked = 0;
    const unmatchedEmails: string[] = [];
    const conflicts: ClickUpMembersSyncResult["conflicts"] = [];

    for (const m of uniqueMembers) {
      const localUser = await prisma.user.findFirst({
        where: { email: { equals: m.email, mode: "insensitive" } },
        select: { id: true, clickupUserId: true },
      });

      if (!localUser) {
        unmatchedEmails.push(m.email);
        continue;
      }

      if (localUser.clickupUserId === m.clickupUserId) {
        alreadyLinked++;
        continue;
      }

      try {
        await prisma.user.update({
          where: { id: localUser.id },
          data: { clickupUserId: m.clickupUserId, clickupEmail: m.email },
        });
        linked++;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          conflicts.push({
            email: m.email,
            clickupUserId: m.clickupUserId,
            reason: "clickup_user_id_already_linked_to_another_user",
          });
          continue;
        }
        throw err;
      }
    }

    return {
      teamsScanned: teams.length,
      membersFound: uniqueMembers.length,
      linked,
      alreadyLinked,
      unmatchedEmails,
      conflicts,
    };
  },
};
