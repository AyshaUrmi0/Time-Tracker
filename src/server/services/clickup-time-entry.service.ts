import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { decrypt } from "@/lib/encryption";
import {
  createClickUpTimeEntry,
  deleteClickUpTimeEntry,
  fetchClickUpTaskTimeEntries,
  fetchClickUpTeams,
  fetchClickUpTimeEntries,
  updateClickUpTimeEntry,
} from "@/lib/clickup/client";
import { handleClickUpInvalidToken } from "@/server/services/clickup-error-handling";
import type {
  ClickUpTimeEntriesPullResult,
  ClickUpTaskTimeEntriesReconcileResult,
} from "@/features/clickup/types";

const DEFAULT_PULL_DAYS = 7;
const MAX_PULL_DAYS = 90;
const PULL_CHUNK_DAYS = 7;
const PULL_CHUNK_MS = PULL_CHUNK_DAYS * 24 * 60 * 60 * 1000;

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
        await handleClickUpInvalidToken(err, entry.userId);
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

  async retryFailedPushes(opts: { maxRetries?: number; batchSize?: number } = {}): Promise<{
    attempted: number;
    succeeded: number;
    stillFailing: number;
    skippedNotPushable: number;
  }> {
    const maxRetries = opts.maxRetries ?? 5;
    const batchSize = opts.batchSize ?? 50;

    const failures = await prisma.timeEntry.findMany({
      where: {
        syncStatus: "FAILED",
        syncRetryCount: { lt: maxRetries },
        endTime: { not: null },
      },
      select: { id: true, clickupTimeEntryId: true },
      orderBy: { syncLastAttemptAt: "asc" },
      take: batchSize,
    });

    let succeeded = 0;
    let stillFailing = 0;
    let skippedNotPushable = 0;

    for (const entry of failures) {
      if (entry.clickupTimeEntryId) {
        const result = await this.pushEntryUpdate(entry.id);
        if (result.pushed) succeeded++;
        else stillFailing++;
      } else {
        await this.pushOnStop(entry.id);
        const after = await prisma.timeEntry.findUnique({
          where: { id: entry.id },
          select: { syncStatus: true, clickupTimeEntryId: true },
        });
        if (after?.syncStatus === "SYNCED") succeeded++;
        else if (after?.clickupTimeEntryId === null && after.syncStatus === "FAILED") stillFailing++;
        else skippedNotPushable++;
      }
    }

    return {
      attempted: failures.length,
      succeeded,
      stillFailing,
      skippedNotPushable,
    };
  },

  async pushEntryUpdate(
    localEntryId: string,
  ): Promise<{ pushed: boolean; reason?: string }> {
    try {
      const entry = await prisma.timeEntry.findUnique({
        where: { id: localEntryId },
        select: {
          id: true,
          userId: true,
          startTime: true,
          endTime: true,
          durationSeconds: true,
          note: true,
          clickupTimeEntryId: true,
          clickupTeamId: true,
          task: { select: { clickupTaskId: true } },
        },
      });
      if (!entry) return { pushed: false, reason: "entry_not_found" };
      if (!entry.clickupTimeEntryId) return { pushed: false, reason: "not_synced" };
      if (!entry.clickupTeamId) return { pushed: false, reason: "no_team" };
      if (entry.endTime === null) return { pushed: false, reason: "running" };

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
        return { pushed: false, reason: "no_connection" };
      }

      const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);
      const durationMs = (entry.durationSeconds ?? 0) * 1000;

      await updateClickUpTimeEntry(
        token,
        entry.clickupTeamId,
        entry.clickupTimeEntryId,
        {
          start: entry.startTime.getTime(),
          duration: durationMs,
          description: entry.note ?? "",
          tid: entry.task.clickupTaskId ?? undefined,
        },
      );

      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          syncStatus: "SYNCED",
          syncLastAttemptAt: new Date(),
          syncLastError: null,
        },
      });

      return { pushed: true };
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 200) ?? "push failed";
      console.error(`[clickup-push] entry update ${localEntryId} failed: ${msg}`);
      const ownerUserId = (
        await prisma.timeEntry
          .findUnique({
            where: { id: localEntryId },
            select: { userId: true },
          })
          .catch(() => null)
      )?.userId;
      if (ownerUserId) await handleClickUpInvalidToken(err, ownerUserId);
      await prisma.timeEntry
        .update({
          where: { id: localEntryId },
          data: {
            syncStatus: "FAILED",
            syncLastAttemptAt: new Date(),
            syncLastError: msg,
            syncRetryCount: { increment: 1 },
          },
        })
        .catch(() => {});
      return { pushed: false, reason: msg };
    }
  },

  async pushEntryDelete(meta: {
    clickupTimeEntryId: string;
    clickupTeamId: string;
    ownerUserId: string;
  }): Promise<{ pushed: boolean; reason?: string }> {
    try {
      let conn = await prisma.clickUpConnection.findUnique({
        where: { userId: meta.ownerUserId },
        select: {
          accessTokenEncrypted: true,
          encryptionIv: true,
          isActive: true,
        },
      });
      if (!conn || !conn.isActive) {
        conn = await prisma.clickUpConnection.findFirst({
          where: { isActive: true },
          select: {
            accessTokenEncrypted: true,
            encryptionIv: true,
            isActive: true,
          },
        });
      }
      if (!conn) return { pushed: false, reason: "no_connection" };

      const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);
      await deleteClickUpTimeEntry(
        token,
        meta.clickupTeamId,
        meta.clickupTimeEntryId,
      );
      return { pushed: true };
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 200) ?? "delete failed";
      console.error(
        `[clickup-push] entry delete ${meta.clickupTimeEntryId} failed: ${msg}`,
      );
      await handleClickUpInvalidToken(err, meta.ownerUserId);
      return { pushed: false, reason: msg };
    }
  },

  async reconcileTaskTimeEntries(
    clickupTaskId: string,
    connectionUserId: string,
  ): Promise<ClickUpTaskTimeEntriesReconcileResult> {
    const empty = {
      imported: 0,
      updated: 0,
      deletedLocally: 0,
      skippedNoUser: 0,
      errors: [] as string[],
    };

    const localTask = await prisma.task.findFirst({
      where: { clickupTaskId },
      select: { id: true },
    });
    if (!localTask) {
      return { status: "skipped", reason: "task_not_found_local", ...empty };
    }

    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: connectionUserId },
      select: {
        accessTokenEncrypted: true,
        encryptionIv: true,
        isActive: true,
      },
    });
    if (!conn || !conn.isActive) {
      return { status: "skipped", reason: "no_connection", ...empty };
    }

    const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);

    let remoteEntries;
    try {
      remoteEntries = await fetchClickUpTaskTimeEntries(token, clickupTaskId);
    } catch (err) {
      await handleClickUpInvalidToken(err, connectionUserId);
      return {
        status: "skipped",
        reason: `fetch_failed: ${(err as Error).message?.slice(0, 200) ?? "unknown"}`,
        ...empty,
      };
    }

    const remoteIds = new Set(remoteEntries.map((e) => e.id));

    const localEntries = await prisma.timeEntry.findMany({
      where: {
        taskId: localTask.id,
        clickupTimeEntryId: { not: null },
      },
      select: {
        id: true,
        clickupTimeEntryId: true,
        startTime: true,
        durationSeconds: true,
        note: true,
      },
    });

    const localByClickupId = new Map<string, (typeof localEntries)[number]>();
    for (const l of localEntries) {
      if (l.clickupTimeEntryId) localByClickupId.set(l.clickupTimeEntryId, l);
    }

    let imported = 0;
    let updated = 0;
    let deletedLocally = 0;
    let skippedNoUser = 0;
    const errors: string[] = [];

    for (const local of localEntries) {
      if (local.clickupTimeEntryId && !remoteIds.has(local.clickupTimeEntryId)) {
        try {
          await prisma.timeEntry.delete({ where: { id: local.id } });
          deletedLocally++;
        } catch (err) {
          errors.push(
            `delete local ${local.id}: ${(err as Error).message?.slice(0, 200) ?? "delete failed"}`,
          );
        }
      }
    }

    if (remoteEntries.length === 0) {
      return {
        status: "ok",
        imported,
        updated,
        deletedLocally,
        skippedNoUser,
        errors,
      };
    }

    const remoteUserIds = Array.from(
      new Set(remoteEntries.map((e) => e.userId)),
    );
    const localUsers = await prisma.user.findMany({
      where: { clickupUserId: { in: remoteUserIds } },
      select: { id: true, clickupUserId: true },
    });
    const userByClickup = new Map<number, string>();
    for (const u of localUsers) {
      if (u.clickupUserId !== null) userByClickup.set(u.clickupUserId, u.id);
    }

    for (const e of remoteEntries) {
      if (e.duration <= 0) continue;

      const existingLocal = localByClickupId.get(e.id);
      if (existingLocal) {
        const remoteStartMs = e.start;
        const remoteDurationSec = Math.round(e.duration / 1000);
        const localStartMs = existingLocal.startTime.getTime();
        const localDurationSec = existingLocal.durationSeconds ?? 0;
        const localNote = existingLocal.note ?? null;
        const remoteNote = e.description ?? null;

        const startChanged = remoteStartMs !== localStartMs;
        const durationChanged = remoteDurationSec !== localDurationSec;
        const noteChanged = (localNote ?? "") !== (remoteNote ?? "");

        if (startChanged || durationChanged || noteChanged) {
          try {
            await prisma.timeEntry.update({
              where: { id: existingLocal.id },
              data: {
                ...(startChanged ? { startTime: new Date(remoteStartMs) } : {}),
                ...(durationChanged || startChanged
                  ? {
                      endTime: new Date(remoteStartMs + e.duration),
                      durationSeconds: remoteDurationSec,
                    }
                  : {}),
                ...(noteChanged ? { note: remoteNote } : {}),
                syncStatus: "SYNCED",
                syncLastAttemptAt: new Date(),
                syncLastError: null,
              },
            });
            updated++;
          } catch (err) {
            errors.push(
              `update entry ${e.id}: ${(err as Error).message?.slice(0, 200) ?? "update failed"}`,
            );
          }
        }
        continue;
      }

      if (!userByClickup.has(e.userId)) {
        skippedNoUser++;
        continue;
      }

      const localUserId = userByClickup.get(e.userId)!;
      const startTime = new Date(e.start);
      const endTime = new Date(e.start + e.duration);
      const durationSeconds = Math.round(e.duration / 1000);

      try {
        await prisma.timeEntry.create({
          data: {
            userId: localUserId,
            taskId: localTask.id,
            startTime,
            endTime,
            durationSeconds,
            note: e.description,
            isManual: false,
            source: "CLICKUP",
            clickupTimeEntryId: e.id,
            clickupTeamId: e.teamId,
            syncStatus: "SYNCED",
            syncLastAttemptAt: new Date(),
          },
        });
        imported++;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          continue;
        }
        errors.push(
          `entry ${e.id}: ${(err as Error).message?.slice(0, 200) ?? "create failed"}`,
        );
      }
    }

    return {
      status: "ok",
      imported,
      updated,
      deletedLocally,
      skippedNoUser,
      errors,
    };
  },

  async pullFromClickUp(
    connectionUserId: string,
    opts: { days?: number } = {},
  ): Promise<ClickUpTimeEntriesPullResult> {
    const days = Math.min(
      Math.max(opts.days ?? DEFAULT_PULL_DAYS, 1),
      MAX_PULL_DAYS,
    );

    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: connectionUserId },
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
    let teams: Awaited<ReturnType<typeof fetchClickUpTeams>>;
    try {
      teams = await fetchClickUpTeams(token);
    } catch (err) {
      await handleClickUpInvalidToken(err, connectionUserId);
      throw err;
    }

    const endMs = Date.now();
    const startMs = endMs - days * 24 * 60 * 60 * 1000;

    let entriesScanned = 0;
    let imported = 0;
    let updated = 0;
    let deletedLocally = 0;
    let skippedAlreadyLocal = 0;
    let skippedNoTask = 0;
    let skippedNoUser = 0;
    let skippedNoDuration = 0;
    const errors: string[] = [];

    const windowStart = new Date(startMs);
    const windowEnd = new Date(endMs);

    for (const team of teams) {
      const remoteEntries: Awaited<
        ReturnType<typeof fetchClickUpTimeEntries>
      > = [];
      const seenRemoteIds = new Set<string>();
      let chunkStart = startMs;
      let teamFetchFailed = false;

      while (chunkStart < endMs) {
        const chunkEnd = Math.min(chunkStart + PULL_CHUNK_MS, endMs);
        try {
          const part = await fetchClickUpTimeEntries(token, team.id, {
            startMs: chunkStart,
            endMs: chunkEnd,
          });
          for (const e of part) {
            if (!seenRemoteIds.has(e.id)) {
              seenRemoteIds.add(e.id);
              remoteEntries.push(e);
            }
          }
        } catch (err) {
          errors.push(
            `team ${team.id} window ${new Date(chunkStart).toISOString()}..${new Date(chunkEnd).toISOString()}: ${(err as Error).message?.slice(0, 200) ?? "fetch failed"}`,
          );
          await handleClickUpInvalidToken(err, connectionUserId);
          teamFetchFailed = true;
          break;
        }
        chunkStart = chunkEnd;
      }

      if (teamFetchFailed) continue;

      entriesScanned += remoteEntries.length;

      const remoteIds = new Set(remoteEntries.map((e) => e.id));

      const localInWindow = await prisma.timeEntry.findMany({
        where: {
          clickupTeamId: team.id,
          clickupTimeEntryId: { not: null },
          startTime: { gte: windowStart, lt: windowEnd },
        },
        select: {
          id: true,
          clickupTimeEntryId: true,
          startTime: true,
          durationSeconds: true,
          note: true,
          taskId: true,
        },
      });

      const localByClickupId = new Map<string, (typeof localInWindow)[number]>();
      for (const l of localInWindow) {
        if (l.clickupTimeEntryId) localByClickupId.set(l.clickupTimeEntryId, l);
      }

      for (const local of localInWindow) {
        if (local.clickupTimeEntryId && !remoteIds.has(local.clickupTimeEntryId)) {
          try {
            await prisma.timeEntry.delete({ where: { id: local.id } });
            deletedLocally++;
          } catch (err) {
            errors.push(
              `delete local ${local.id}: ${(err as Error).message?.slice(0, 200) ?? "delete failed"}`,
            );
          }
        }
      }

      if (remoteEntries.length === 0) continue;

      const remoteTaskIds = Array.from(
        new Set(remoteEntries.map((e) => e.taskId).filter((id): id is string => !!id)),
      );
      const remoteUserIds = Array.from(
        new Set(remoteEntries.map((e) => e.userId)),
      );

      const [localTasks, localUsers] = await Promise.all([
        remoteTaskIds.length > 0
          ? prisma.task.findMany({
              where: { clickupTaskId: { in: remoteTaskIds } },
              select: { id: true, clickupTaskId: true },
            })
          : Promise.resolve([] as { id: string; clickupTaskId: string | null }[]),
        prisma.user.findMany({
          where: { clickupUserId: { in: remoteUserIds } },
          select: { id: true, clickupUserId: true },
        }),
      ]);

      const taskByClickup = new Map<string, string>();
      for (const t of localTasks) {
        if (t.clickupTaskId) taskByClickup.set(t.clickupTaskId, t.id);
      }
      const userByClickup = new Map<number, string>();
      for (const u of localUsers) {
        if (u.clickupUserId !== null) userByClickup.set(u.clickupUserId, u.id);
      }

      for (const e of remoteEntries) {
        if (e.duration <= 0) {
          skippedNoDuration++;
          continue;
        }

        const existingLocal = localByClickupId.get(e.id);
        if (existingLocal) {
          const remoteStartMs = e.start;
          const remoteDurationSec = Math.round(e.duration / 1000);
          const localStartMs = existingLocal.startTime.getTime();
          const localDurationSec = existingLocal.durationSeconds ?? 0;
          const localNote = existingLocal.note ?? null;
          const remoteNote = e.description ?? null;
          const remoteTaskLocalId = e.taskId ? taskByClickup.get(e.taskId) : undefined;

          const startChanged = remoteStartMs !== localStartMs;
          const durationChanged = remoteDurationSec !== localDurationSec;
          const noteChanged = (localNote ?? "") !== (remoteNote ?? "");
          const taskChanged =
            remoteTaskLocalId !== undefined &&
            remoteTaskLocalId !== existingLocal.taskId;

          if (startChanged || durationChanged || noteChanged || taskChanged) {
            try {
              await prisma.timeEntry.update({
                where: { id: existingLocal.id },
                data: {
                  ...(startChanged ? { startTime: new Date(remoteStartMs) } : {}),
                  ...(durationChanged || startChanged
                    ? {
                        endTime: new Date(remoteStartMs + e.duration),
                        durationSeconds: remoteDurationSec,
                      }
                    : {}),
                  ...(noteChanged ? { note: remoteNote } : {}),
                  ...(taskChanged && remoteTaskLocalId
                    ? { taskId: remoteTaskLocalId }
                    : {}),
                  syncStatus: "SYNCED",
                  syncLastAttemptAt: new Date(),
                  syncLastError: null,
                },
              });
              updated++;
            } catch (err) {
              errors.push(
                `update entry ${e.id}: ${(err as Error).message?.slice(0, 200) ?? "update failed"}`,
              );
            }
          } else {
            skippedAlreadyLocal++;
          }
          continue;
        }

        if (!e.taskId || !taskByClickup.has(e.taskId)) {
          skippedNoTask++;
          continue;
        }
        if (!userByClickup.has(e.userId)) {
          skippedNoUser++;
          continue;
        }

        const localTaskId = taskByClickup.get(e.taskId)!;
        const localUserId = userByClickup.get(e.userId)!;
        const startTime = new Date(e.start);
        const endTime = new Date(e.start + e.duration);
        const durationSeconds = Math.round(e.duration / 1000);

        try {
          await prisma.timeEntry.create({
            data: {
              userId: localUserId,
              taskId: localTaskId,
              startTime,
              endTime,
              durationSeconds,
              note: e.description,
              isManual: false,
              source: "CLICKUP",
              clickupTimeEntryId: e.id,
              clickupTeamId: team.id,
              syncStatus: "SYNCED",
              syncLastAttemptAt: new Date(),
            },
          });
          imported++;
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            skippedAlreadyLocal++;
            continue;
          }
          errors.push(
            `entry ${e.id}: ${(err as Error).message?.slice(0, 200) ?? "create failed"}`,
          );
        }
      }
    }

    return {
      teamsScanned: teams.length,
      entriesScanned,
      imported,
      updated,
      deletedLocally,
      skippedAlreadyLocal,
      skippedNoTask,
      skippedNoUser,
      skippedNoDuration,
      windowDays: days,
      errors,
    };
  },
};
