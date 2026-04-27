import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import {
  fetchClickUpListStatuses,
  fetchClickUpTaskDetail,
  updateClickUpTask,
  type ClickUpListStatus,
  type UpdateClickUpTaskInput,
} from "@/lib/clickup/client";
import type { TaskStatus } from "@prisma/client";

export type ClickUpTaskPushResult =
  | { pushed: true }
  | { pushed: false; reason: string };

function clickupTypeToTaskStatus(type: string): TaskStatus {
  if (type === "closed" || type === "done") return "DONE";
  if (type === "open") return "TODO";
  return "IN_PROGRESS";
}

function pickClickUpStatusName(
  target: TaskStatus,
  statuses: ClickUpListStatus[],
  currentName: string | null,
): string | null {
  if (statuses.length === 0) return null;

  if (currentName) {
    const current = statuses.find(
      (s) => s.status.toLowerCase() === currentName.toLowerCase(),
    );
    if (current && clickupTypeToTaskStatus(current.type) === target) {
      return current.status;
    }
  }

  const sorted = [...statuses].sort((a, b) => a.orderindex - b.orderindex);
  const candidate = sorted.find(
    (s) => clickupTypeToTaskStatus(s.type) === target,
  );
  return candidate?.status ?? null;
}

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
      return { pushed: false, reason: msg };
    }
  },

  async pushTaskUpdate(
    localTaskId: string,
    changedFields: {
      title?: boolean;
      description?: boolean;
      status?: boolean;
      assignee?: boolean;
    },
  ): Promise<ClickUpTaskPushResult> {
    try {
      if (
        !changedFields.title &&
        !changedFields.description &&
        !changedFields.status &&
        !changedFields.assignee
      ) {
        return { pushed: false, reason: "no_pushable_fields_changed" };
      }

      const task = await prisma.task.findUnique({
        where: { id: localTaskId },
        select: {
          title: true,
          description: true,
          status: true,
          assignedToId: true,
          clickupTaskId: true,
          clickupListId: true,
          clickupStatus: true,
          createdById: true,
          assignedTo: { select: { clickupUserId: true } },
        },
      });
      if (!task) return { pushed: false, reason: "task_not_found" };
      if (!task.clickupTaskId) return { pushed: false, reason: "not_a_clickup_task" };

      const conn = await findActiveConnection(task.createdById);
      if (!conn) return { pushed: false, reason: "no_active_connection" };

      const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);

      const update: UpdateClickUpTaskInput = {};
      if (changedFields.title) update.name = task.title;
      if (changedFields.description) update.description = task.description ?? "";

      if (changedFields.status && task.clickupListId) {
        const statuses = await fetchClickUpListStatuses(token, task.clickupListId);
        const statusName = pickClickUpStatusName(
          task.status,
          statuses,
          task.clickupStatus,
        );
        if (statusName) update.status = statusName;
      }

      if (changedFields.assignee) {
        const newClickupUserId = task.assignedTo?.clickupUserId ?? null;

        const detail = await fetchClickUpTaskDetail(token, task.clickupTaskId);
        const remoteAssigneeIds = (detail?.assignees ?? []).map((a) => a.id);

        const localUsers = await prisma.user.findMany({
          where: { clickupUserId: { not: null } },
          select: { clickupUserId: true },
        });
        const localPool = new Set(
          localUsers
            .map((u) => u.clickupUserId)
            .filter((id): id is number => id !== null),
        );

        const add: number[] = [];
        const rem: number[] = [];

        if (
          newClickupUserId !== null &&
          !remoteAssigneeIds.includes(newClickupUserId)
        ) {
          add.push(newClickupUserId);
        }
        for (const remoteId of remoteAssigneeIds) {
          if (localPool.has(remoteId) && remoteId !== newClickupUserId) {
            rem.push(remoteId);
          }
        }

        if (add.length > 0 || rem.length > 0) {
          update.assignees = { add, rem };
        }
      }

      if (
        update.name === undefined &&
        update.description === undefined &&
        update.status === undefined &&
        update.assignees === undefined
      ) {
        return { pushed: false, reason: "nothing_to_push" };
      }

      await updateClickUpTask(token, task.clickupTaskId, update);

      await prisma.task.update({
        where: { id: localTaskId },
        data: { clickupLastSyncedAt: new Date() },
      });

      return { pushed: true };
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 200) ?? "push_failed";
      console.error(`[clickup-push] task ${localTaskId} failed: ${msg}`);
      return { pushed: false, reason: msg };
    }
  },
};
