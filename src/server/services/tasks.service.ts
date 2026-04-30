import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { clickupTaskPushService } from "@/server/services/clickup-task-push.service";
import type { ListTasksQuery } from "@/features/tasks/tasks.schema";
import type { SessionUser } from "@/types";

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  isArchived: true,
  createdById: true,
  assignedToId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  clickupTaskId: true,
  clickupUrl: true,
  clickupLastSyncedAt: true,
  clickupStatus: true,
  clickupStatusColor: true,
  clickupPriority: true,
  clickupDueDate: true,
  clickupTags: true,
  clickupSpaceName: true,
  clickupFolderName: true,
  clickupListName: true,
} as const;

function requireAdmin(user: SessionUser): void {
  if (user.role !== "ADMIN") throw ApiErrors.forbidden();
}

export const tasksService = {
  async list(query: ListTasksQuery) {
    const where: {
      status?: ListTasksQuery["status"];
      assignedToId?: string;
      isArchived?: boolean;
    } = {};
    if (query.status) where.status = query.status;
    if (query.assignedToId) where.assignedToId = query.assignedToId;
    if (query.archived === "true") where.isArchived = true;
    else if (query.archived === "false") where.isArchived = false;

    return prisma.task.findMany({
      where,
      orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }],
      select: taskSelect,
    });
  },

  async getById(id: string) {
    const task = await prisma.task.findUnique({ where: { id }, select: taskSelect });
    if (!task) throw ApiErrors.notFound("Task not found");
    return task;
  },

  async archive(user: SessionUser, id: string) {
    requireAdmin(user);

    const existing = await prisma.task.findUnique({
      where: { id },
      select: { id: true, createdById: true, isArchived: true },
    });
    if (!existing) throw ApiErrors.notFound("Task not found");
    if (existing.isArchived) return existing;

    const archived = await prisma.task.update({
      where: { id },
      data: { isArchived: true },
      select: taskSelect,
    });

    await clickupTaskPushService.pushTaskArchive(id);

    return archived;
  },
};
