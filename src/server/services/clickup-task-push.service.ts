import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { updateClickUpTask } from "@/lib/clickup/client";
import { handleClickUpInvalidToken } from "@/server/services/clickup-error-handling";

export type ClickUpTaskPushResult =
  | { pushed: true }
  | { pushed: false; reason: string };

async function findActiveConnection(preferredUserId: string) {
  const preferred = await prisma.clickUpConnection.findUnique({
    where: { userId: preferredUserId },
    select: {
      accessTokenEncrypted: true,
      encryptionIv: true,
      isActive: true,
    },
  });
  if (preferred?.isActive) return preferred;

  const fallback = await prisma.clickUpConnection.findFirst({
    where: { isActive: true },
    select: {
      accessTokenEncrypted: true,
      encryptionIv: true,
      isActive: true,
    },
  });
  return fallback;
}

export const clickupTaskPushService = {
  async pushTaskArchive(localTaskId: string): Promise<ClickUpTaskPushResult> {
    try {
      const task = await prisma.task.findUnique({
        where: { id: localTaskId },
        select: {
          clickupTaskId: true,
          createdById: true,
        },
      });
      if (!task) return { pushed: false, reason: "task_not_found" };
      if (!task.clickupTaskId) return { pushed: false, reason: "not_a_clickup_task" };

      const conn = await findActiveConnection(task.createdById);
      if (!conn) return { pushed: false, reason: "no_active_connection" };

      const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);
      await updateClickUpTask(token, task.clickupTaskId, { archived: true });

      await prisma.task.update({
        where: { id: localTaskId },
        data: { clickupLastSyncedAt: new Date() },
      });

      return { pushed: true };
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 200) ?? "push_failed";
      console.error(`[clickup-push] archive ${localTaskId} failed: ${msg}`);
      const task = await prisma.task
        .findUnique({
          where: { id: localTaskId },
          select: { createdById: true },
        })
        .catch(() => null);
      if (task) await handleClickUpInvalidToken(err, task.createdById);
      return { pushed: false, reason: msg };
    }
  },
};
