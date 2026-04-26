import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { createClickUpTimeEntry } from "@/lib/clickup/client";

export const clickupTimeEntryService = {
  async pushOnStop(timeEntryId: string): Promise<void> {
    try {
      const entry = await prisma.timeEntry.findUnique({
        where: { id: timeEntryId },
        select: {
          id: true,
          userId: true,
          startTime: true,
          endTime: true,
          durationSeconds: true,
          note: true,
          clickupTimeEntryId: true,
          task: {
            select: {
              clickupTaskId: true,
              clickupWorkspaceId: true,
            },
          },
        },
      });

      if (!entry) return;
      if (entry.endTime === null) return;
      if (entry.clickupTimeEntryId) return;
      if (!entry.task.clickupTaskId || !entry.task.clickupWorkspaceId) return;

      const durationMs = (entry.durationSeconds ?? 0) * 1000;
      if (durationMs <= 0) return;

      const conn = await prisma.clickUpConnection.findUnique({
        where: { userId: entry.userId },
        select: {
          accessTokenEncrypted: true,
          encryptionIv: true,
          isActive: true,
        },
      });
      if (!conn || !conn.isActive) {
        await prisma.timeEntry.update({
          where: { id: entry.id },
          data: {
            syncStatus: "FAILED",
            syncLastAttemptAt: new Date(),
            syncLastError: "ClickUp not connected",
            syncRetryCount: { increment: 1 },
          },
        });
        return;
      }

      const teamId = entry.task.clickupWorkspaceId;
      const tid = entry.task.clickupTaskId;

      try {
        const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);
        const result = await createClickUpTimeEntry(token, teamId, {
          tid,
          start: entry.startTime.getTime(),
          duration: durationMs,
          description: entry.note ?? undefined,
          billable: false,
        });
        await prisma.timeEntry.update({
          where: { id: entry.id },
          data: {
            syncStatus: "SYNCED",
            clickupTimeEntryId: result.id,
            clickupTeamId: teamId,
            syncLastAttemptAt: new Date(),
            syncLastError: null,
          },
        });
      } catch (err) {
        const msg = (err as Error).message ?? "Push failed";
        await prisma.timeEntry.update({
          where: { id: entry.id },
          data: {
            syncStatus: "FAILED",
            syncLastAttemptAt: new Date(),
            syncLastError: msg.slice(0, 200),
            syncRetryCount: { increment: 1 },
          },
        });
        console.error(`[clickup-push] entry ${entry.id}: ${msg}`);
      }
    } catch (err) {
      console.error("[clickup-push] unexpected error:", err);
    }
  },
};
