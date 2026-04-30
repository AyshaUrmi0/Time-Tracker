import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  fetchClickUpTeamsWithMembers,
  fetchClickUpUser,
} from "@/lib/clickup/client";
import type { ConnectClickUpInput } from "@/features/clickup/clickup.schema";
import type { ClickUpConnectionStatus } from "@/features/clickup/types";
import type { SessionUser } from "@/types";

async function autoLinkMember(actorUserId: string): Promise<void> {
  const localUser = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { id: true, email: true, clickupUserId: true },
  });
  if (!localUser || localUser.clickupUserId !== null) return;

  const adminConn = await prisma.clickUpConnection.findFirst({
    where: { isActive: true, revokedAt: null },
    select: { accessTokenEncrypted: true, encryptionIv: true },
  });
  if (!adminConn) return;

  let members: Awaited<ReturnType<typeof fetchClickUpTeamsWithMembers>>["members"];
  try {
    const token = decrypt(adminConn.accessTokenEncrypted, adminConn.encryptionIv);
    const result = await fetchClickUpTeamsWithMembers(token);
    members = result.members;
  } catch {
    return;
  }

  const match = members.find(
    (m) => m.email.toLowerCase() === localUser.email.toLowerCase(),
  );
  if (!match) return;

  try {
    await prisma.user.update({
      where: { id: localUser.id },
      data: { clickupUserId: match.clickupUserId, clickupEmail: match.email },
    });
  } catch (err) {
    if (
      !(err instanceof Prisma.PrismaClientKnownRequestError) ||
      err.code !== "P2002"
    ) {
      throw err;
    }
  }
}

export const clickupService = {
  async getStatus(actor: SessionUser): Promise<ClickUpConnectionStatus> {
    if (actor.role !== "ADMIN") {
      const anyActive = await prisma.clickUpConnection.findFirst({
        where: { isActive: true, revokedAt: null },
        select: { id: true },
      });
      if (anyActive) {
        await autoLinkMember(actor.userId);
        return {
          connected: true,
          clickupUserId: 0,
          clickupUserEmail: "",
          connectedAt: new Date(0).toISOString(),
          lastSyncAt: null,
          lastError: null,
        };
      }
      return { connected: false, lastError: null };
    }

    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: {
        clickupUserId: true,
        clickupUserEmail: true,
        connectedAt: true,
        lastSyncAt: true,
        lastError: true,
        isActive: true,
        revokedAt: true,
      },
    });

    if (!conn || !conn.isActive || conn.revokedAt) {
      return { connected: false, lastError: conn?.lastError ?? null };
    }

    return {
      connected: true,
      clickupUserId: conn.clickupUserId,
      clickupUserEmail: conn.clickupUserEmail,
      connectedAt: conn.connectedAt.toISOString(),
      lastSyncAt: conn.lastSyncAt ? conn.lastSyncAt.toISOString() : null,
      lastError: conn.lastError,
    };
  },

  async connect(actor: SessionUser, input: ConnectClickUpInput) {
    const clickupUser = await fetchClickUpUser(input.personalToken);

    const otherOwner = await prisma.clickUpConnection.findFirst({
      where: {
        clickupUserId: clickupUser.id,
        userId: { not: actor.userId },
        isActive: true,
      },
      select: { id: true },
    });
    if (otherOwner) {
      throw ApiErrors.conflict(
        "CLICKUP_TOKEN_IN_USE",
        "This ClickUp account is already connected to a different team member.",
      );
    }

    const { encrypted, iv } = encrypt(input.personalToken);

    const conn = await prisma.clickUpConnection.upsert({
      where: { userId: actor.userId },
      create: {
        userId: actor.userId,
        accessTokenEncrypted: encrypted,
        encryptionIv: iv,
        clickupUserId: clickupUser.id,
        clickupUserEmail: clickupUser.email,
        isActive: true,
      },
      update: {
        accessTokenEncrypted: encrypted,
        encryptionIv: iv,
        clickupUserId: clickupUser.id,
        clickupUserEmail: clickupUser.email,
        isActive: true,
        revokedAt: null,
        lastError: null,
      },
      select: {
        clickupUserId: true,
        clickupUserEmail: true,
        connectedAt: true,
        lastSyncAt: true,
        lastError: true,
      },
    });

    await prisma.user.update({
      where: { id: actor.userId },
      data: { clickupUserId: clickupUser.id, clickupEmail: clickupUser.email },
    });

    const status: ClickUpConnectionStatus = {
      connected: true,
      clickupUserId: conn.clickupUserId,
      clickupUserEmail: conn.clickupUserEmail,
      connectedAt: conn.connectedAt.toISOString(),
      lastSyncAt: conn.lastSyncAt ? conn.lastSyncAt.toISOString() : null,
      lastError: conn.lastError,
    };
    return status;
  },

  async disconnect(actor: SessionUser): Promise<{ disconnected: boolean }> {
    const existing = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: { id: true, isActive: true },
    });
    if (!existing || !existing.isActive) return { disconnected: false };

    await prisma.clickUpConnection.update({
      where: { userId: actor.userId },
      data: { isActive: false, revokedAt: new Date() },
    });
    return { disconnected: true };
  },
};
