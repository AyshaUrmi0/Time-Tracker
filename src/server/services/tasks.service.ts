import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { clickupTaskPushService } from "@/server/services/clickup-task-push.service";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
} from "@/features/tasks/tasks.schema";
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

  async create(user: SessionUser, input: CreateTaskInput) {
    requireAdmin(user);

    if (input.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: input.assignedToId },
        select: { id: true, isArchived: true },
      });
      if (!assignee || assignee.isArchived) {
        throw ApiErrors.validation({ fieldErrors: { assignedToId: ["Assignee not found"] } });
      }
    }

    return prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "TODO",
        assignedToId: input.assignedToId ?? null,
        createdById: user.userId,
      },
      select: taskSelect,
    });
  },

  async update(user: SessionUser, id: string, input: UpdateTaskInput) {
    requireAdmin(user);

    const existing = await prisma.task.findUnique({
      where: { id },
      select: { id: true, isArchived: true },
    });
    if (!existing) throw ApiErrors.notFound("Task not found");
    if (existing.isArchived) throw ApiErrors.conflict("TASK_ARCHIVED", "Task is archived");

    if (input.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: input.assignedToId },
        select: { id: true, isArchived: true },
      });
      if (!assignee || assignee.isArchived) {
        throw ApiErrors.validation({ fieldErrors: { assignedToId: ["Assignee not found"] } });
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId ?? null } : {}),
      },
      select: taskSelect,
    });

    await clickupTaskPushService.pushTaskUpdate(id, {
      title: input.title !== undefined,
      description: input.description !== undefined,
      status: input.status !== undefined,
      assignee: input.assignedToId !== undefined,
    });

    return updated;
  },

  async archive(user: SessionUser, id: string) {
    requireAdmin(user);

    const existing = await prisma.task.findUnique({
      where: { id },
      select: { id: true, createdById: true, isArchived: true },
    });
    if (!existing) throw ApiErrors.notFound("Task not found");
    if (existing.isArchived) return existing;

    return prisma.task.update({
      where: { id },
      data: { isArchived: true },
      select: taskSelect,
    });
  },
};
