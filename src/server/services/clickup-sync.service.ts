import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { decrypt } from "@/lib/encryption";
import { handleClickUpInvalidToken } from "@/server/services/clickup-error-handling";
import {
  fetchClickUpFolders,
  fetchClickUpFolderlessLists,
  fetchClickUpSpaces,
  fetchClickUpTasksPage,
  fetchClickUpTeams,
  type ClickUpListMeta,
  type ClickUpTask,
  type ClickUpTaskDetail,
} from "@/lib/clickup/client";
import type { ClickUpSyncResult } from "@/features/clickup/types";
import type { SessionUser } from "@/types";
import type { TaskStatus } from "@prisma/client";

const MAX_TASKS_PER_LIST = 1000;

type SyncContext = {
  token: string;
  syncerId: string;
  syncedAt: Date;
  userIdByClickup: Map<number, string>;
  counters: {
    listsScanned: number;
    tasksImported: number;
    tasksUpdated: number;
  };
  errors: string[];
};

type ListLocation = {
  teamId: string;
  spaceId: string;
  spaceName: string;
  folderId: string | null;
  folderName: string | null;
};

function mapStatus(s: ClickUpTask["status"]): {
  status: TaskStatus;
  name: string | null;
  color: string | null;
} {
  const type = s?.type ?? null;
  const name = s?.status ?? null;
  const color = s?.color ?? null;
  if (type === "closed" || type === "done") {
    return { status: "DONE", name, color };
  }
  if (type === "open") {
    return { status: "TODO", name, color };
  }
  return { status: "IN_PROGRESS", name, color };
}

function mapPriority(p: ClickUpTask["priority"]): number | null {
  if (!p) return null;
  const id = p.id;
  if (!id) return null;
  const n = Number.parseInt(id, 10);
  return Number.isFinite(n) ? n : null;
}

function parseEpochMs(value: string | null | undefined): Date | null {
  if (!value) return null;
  const ms = Number.parseInt(value, 10);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}

type AssigneeLike = {
  id: number;
  username?: string;
  email?: string;
};

async function resolveAssignedToId(
  assignees: AssigneeLike[] | undefined,
  userIdByClickup: Map<number, string>,
): Promise<string | null> {
  if (!assignees || assignees.length === 0) return null;

  const matched = assignees.find((a) => userIdByClickup.has(a.id));
  if (matched) return userIdByClickup.get(matched.id) ?? null;

  for (const a of assignees) {
    if (!a.email) continue;
    const localUser = await prisma.user.findFirst({
      where: { email: { equals: a.email, mode: "insensitive" } },
      select: { id: true, clickupUserId: true },
    });
    if (!localUser) continue;
    if (localUser.clickupUserId !== a.id) {
      try {
        await prisma.user.update({
          where: { id: localUser.id },
          data: { clickupUserId: a.id, clickupEmail: a.email },
        });
      } catch {
        return localUser.id;
      }
    }
    userIdByClickup.set(a.id, localUser.id);
    return localUser.id;
  }

  return null;
}

async function upsertTask(
  ctx: SyncContext,
  task: ClickUpTask,
  list: ClickUpListMeta,
  loc: ListLocation,
): Promise<"imported" | "updated"> {
  const statusMap = mapStatus(task.status);
  const assignedToId = await resolveAssignedToId(
    task.assignees,
    ctx.userIdByClickup,
  );

  const data = {
    title: task.name?.trim() || "(untitled)",
    description: task.description ?? null,
    status: statusMap.status,
    assignedToId,
    source: "CLICKUP" as const,
    clickupTaskId: task.id,
    clickupWorkspaceId: loc.teamId,
    clickupSpaceId: loc.spaceId,
    clickupSpaceName: loc.spaceName,
    clickupFolderId: loc.folderId,
    clickupFolderName: loc.folderName,
    clickupListId: list.id,
    clickupListName: list.name,
    clickupUrl: task.url ?? null,
    clickupStatus: statusMap.name,
    clickupStatusColor: statusMap.color,
    clickupPriority: mapPriority(task.priority),
    clickupDueDate: parseEpochMs(task.due_date),
    clickupTags: (task.tags ?? []).map((t) => t.name),
    clickupLastSyncedAt: ctx.syncedAt,
  };

  const existing = await prisma.task.findUnique({
    where: { clickupTaskId: task.id },
    select: { id: true },
  });

  if (existing) {
    await prisma.task.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.task.create({
    data: { ...data, createdById: ctx.syncerId },
  });
  return "imported";
}

async function syncList(
  ctx: SyncContext,
  list: ClickUpListMeta,
  loc: ListLocation,
) {
  ctx.counters.listsScanned++;
  let page = 0;
  let totalScanned = 0;

  while (true) {
    const { tasks, lastPage } = await fetchClickUpTasksPage(
      ctx.token,
      list.id,
      page,
    );
    if (tasks.length === 0) break;

    for (const task of tasks) {
      try {
        const result = await upsertTask(ctx, task, list, loc);
        if (result === "imported") ctx.counters.tasksImported++;
        else ctx.counters.tasksUpdated++;
      } catch (err) {
        ctx.errors.push(
          `Task ${task.id}: ${(err as Error).message ?? "upsert failed"}`,
        );
      }
    }

    totalScanned += tasks.length;
    if (lastPage || totalScanned >= MAX_TASKS_PER_LIST) break;
    page++;
  }
}

export type UpsertSingleTaskResult =
  | { status: "imported"; localTaskId: string }
  | { status: "updated"; localTaskId: string }
  | { status: "skipped"; reason: string };

export async function upsertSingleTaskFromClickUp(
  detail: ClickUpTaskDetail,
  syncerId: string,
): Promise<UpsertSingleTaskResult> {
  if (!detail.list?.id) return { status: "skipped", reason: "missing_list" };
  if (!detail.team_id) return { status: "skipped", reason: "missing_team" };

  const existing = await prisma.task.findUnique({
    where: { clickupTaskId: detail.id },
    select: {
      id: true,
      clickupSpaceName: true,
      clickupFolderId: true,
      clickupFolderName: true,
      clickupListName: true,
    },
  });

  const localUsers = await prisma.user.findMany({
    where: { clickupUserId: { not: null } },
    select: { id: true, clickupUserId: true },
  });
  const userIdByClickup = new Map<number, string>();
  for (const u of localUsers) {
    if (u.clickupUserId !== null) userIdByClickup.set(u.clickupUserId, u.id);
  }
  const assignedToId = await resolveAssignedToId(
    detail.assignees,
    userIdByClickup,
  );

  const statusMap = mapStatus(detail.status);

  const data = {
    title: detail.name?.trim() || "(untitled)",
    description: detail.description ?? null,
    status: statusMap.status,
    assignedToId,
    source: "CLICKUP" as const,
    clickupTaskId: detail.id,
    clickupWorkspaceId: detail.team_id,
    clickupSpaceId: detail.space?.id ?? null,
    clickupSpaceName: detail.space?.name ?? existing?.clickupSpaceName ?? null,
    clickupFolderId: detail.folder?.id ?? existing?.clickupFolderId ?? null,
    clickupFolderName:
      detail.folder?.name ?? existing?.clickupFolderName ?? null,
    clickupListId: detail.list.id,
    clickupListName: detail.list.name ?? existing?.clickupListName ?? "",
    clickupUrl: detail.url ?? null,
    clickupStatus: statusMap.name,
    clickupStatusColor: statusMap.color,
    clickupPriority: mapPriority(detail.priority),
    clickupDueDate: parseEpochMs(detail.due_date),
    clickupTags: (detail.tags ?? []).map((t) => t.name),
    clickupLastSyncedAt: new Date(),
  };

  if (existing) {
    await prisma.task.update({ where: { id: existing.id }, data });
    return { status: "updated", localTaskId: existing.id };
  }
  const created = await prisma.task.create({
    data: { ...data, createdById: syncerId },
  });
  return { status: "imported", localTaskId: created.id };
}

export const clickupSyncService = {
  async runInitialSync(actor: SessionUser): Promise<ClickUpSyncResult> {
    const startedAt = new Date();

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

    const localUsers = await prisma.user.findMany({
      where: { clickupUserId: { not: null } },
      select: { id: true, clickupUserId: true },
    });
    const userIdByClickup = new Map<number, string>();
    for (const u of localUsers) {
      if (u.clickupUserId !== null) userIdByClickup.set(u.clickupUserId, u.id);
    }

    const ctx: SyncContext = {
      token,
      syncerId: actor.userId,
      syncedAt: startedAt,
      userIdByClickup,
      counters: { listsScanned: 0, tasksImported: 0, tasksUpdated: 0 },
      errors: [],
    };

    let teamsScanned = 0;
    let topLevelError: string | null = null;

    try {
      const teams = await fetchClickUpTeams(token);
      teamsScanned = teams.length;

      for (const team of teams) {
        const spaces = await fetchClickUpSpaces(token, team.id);
        for (const space of spaces) {
          const loc = {
            teamId: team.id,
            spaceId: space.id,
            spaceName: space.name,
          };

          const folderlessLists = await fetchClickUpFolderlessLists(
            token,
            space.id,
          );
          for (const list of folderlessLists) {
            await syncList(ctx, list, {
              ...loc,
              folderId: null,
              folderName: null,
            });
          }

          const folders = await fetchClickUpFolders(token, space.id);
          for (const folder of folders) {
            for (const list of folder.lists) {
              await syncList(ctx, list, {
                ...loc,
                folderId: folder.id,
                folderName: folder.name,
              });
            }
          }
        }
      }
    } catch (err) {
      topLevelError = (err as Error).message ?? "Sync failed";
      ctx.errors.unshift(topLevelError);
      await handleClickUpInvalidToken(err, actor.userId);
    }

    const finishedAt = new Date();

    await prisma.clickUpConnection.update({
      where: { userId: actor.userId },
      data: {
        lastSyncAt: finishedAt,
        lastError: topLevelError ? topLevelError.slice(0, 200) : null,
      },
    });

    return {
      teamsScanned,
      listsScanned: ctx.counters.listsScanned,
      tasksImported: ctx.counters.tasksImported,
      tasksUpdated: ctx.counters.tasksUpdated,
      errors: ctx.errors,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
  },
};
