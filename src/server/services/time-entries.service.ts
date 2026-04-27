import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { LIMITS } from "@/lib/validation";
import { clickupTimeEntryService } from "@/server/services/clickup-time-entry.service";
import type {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  ListTimeEntriesQuery,
} from "@/features/time-entries/time-entries.schema";
import type { SessionUser } from "@/types";

const entrySelect = {
  id: true,
  userId: true,
  taskId: true,
  note: true,
  startTime: true,
  endTime: true,
  durationSeconds: true,
  isManual: true,
  source: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true } },
  task: {
    select: {
      id: true,
      title: true,
      status: true,
      isArchived: true,
      clickupTaskId: true,
    },
  },
  syncStatus: true,
  clickupTimeEntryId: true,
  syncLastError: true,
} as const;

function computeDurationSeconds(startTime: Date, endTime: Date): number {
  return Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
}

function assertManualWindow(startTime: Date, endTime: Date) {
  const now = Date.now();
  const pastLimit = now - LIMITS.startTimePastDays * 24 * 60 * 60 * 1000;
  const futureLimit = now + LIMITS.endTimeFutureSkewMinutes * 60 * 1000;

  if (startTime.getTime() < pastLimit) {
    throw ApiErrors.validation(
      {
        fieldErrors: {
          startTime: [
            `Start time cannot be more than ${LIMITS.startTimePastDays} days in the past`,
          ],
        },
      },
    );
  }
  if (endTime.getTime() > futureLimit) {
    throw ApiErrors.validation({
      fieldErrors: { endTime: ["End time cannot be in the future"] },
    });
  }
  if (endTime.getTime() <= startTime.getTime()) {
    throw ApiErrors.validation({
      fieldErrors: { endTime: ["End time must be after start time"] },
    });
  }
}

async function assertNoOverlap(
  userId: string,
  newStart: Date,
  newEnd: Date,
  excludeId?: string,
) {
  const completed = await prisma.timeEntry.findFirst({
    where: {
      userId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      endTime: { not: null, gt: newStart },
      startTime: { lt: newEnd },
    },
    select: { id: true, startTime: true, endTime: true },
  });
  if (completed) {
    throw ApiErrors.conflict(
      "OVERLAP",
      "Time conflicts with an existing entry",
      { conflictingEntryId: completed.id },
    );
  }

  const running = await prisma.timeEntry.findFirst({
    where: {
      userId,
      endTime: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, startTime: true },
  });
  if (running) {
    const runningEnd = new Date();
    if (newStart < runningEnd && newEnd > running.startTime) {
      throw ApiErrors.conflict(
        "OVERLAP",
        "Time conflicts with a running timer",
        { conflictingEntryId: running.id },
      );
    }
  }
}

function canMutateEntry(user: SessionUser, ownerId: string): boolean {
  return user.role === "ADMIN" || user.userId === ownerId;
}

export const timeEntriesService = {
  async list(user: SessionUser, query: ListTimeEntriesQuery) {
    const isAdmin = user.role === "ADMIN";
    const userId = isAdmin ? query.userId : user.userId;

    const where: {
      userId?: string;
      taskId?: string;
      startTime?: { gte?: Date; lt?: Date };
    } = {};
    if (userId) where.userId = userId;
    if (query.taskId) where.taskId = query.taskId;

    if (query.from && query.to) {
      where.startTime = {
        gte: new Date(query.from),
        lt: new Date(query.to),
      };
    } else {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() - 30);
      where.startTime = { gte: fallback };
    }

    return prisma.timeEntry.findMany({
      where,
      orderBy: { startTime: "desc" },
      select: entrySelect,
      take: 500,
    });
  },

  async getById(user: SessionUser, id: string) {
    const entry = await prisma.timeEntry.findUnique({
      where: { id },
      select: entrySelect,
    });
    if (!entry) throw ApiErrors.notFound("Time entry not found");
    if (!canMutateEntry(user, entry.userId)) throw ApiErrors.forbidden();
    return entry;
  },

  async create(user: SessionUser, input: CreateTimeEntryInput) {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    assertManualWindow(startTime, endTime);

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, isArchived: true },
    });
    if (!task) throw ApiErrors.notFound("Task not found");
    if (task.isArchived) {
      throw ApiErrors.conflict(
        "TASK_ARCHIVED",
        "Can't log time on an archived task",
      );
    }

    await assertNoOverlap(user.userId, startTime, endTime);

    return prisma.timeEntry.create({
      data: {
        userId: user.userId,
        taskId: input.taskId,
        note: input.note ?? null,
        startTime,
        endTime,
        durationSeconds: computeDurationSeconds(startTime, endTime),
        isManual: true,
      },
      select: entrySelect,
    });
  },

  async update(user: SessionUser, id: string, input: UpdateTimeEntryInput) {
    const existing = await prisma.timeEntry.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        taskId: true,
        startTime: true,
        endTime: true,
        isManual: true,
      },
    });
    if (!existing) throw ApiErrors.notFound("Time entry not found");
    if (!canMutateEntry(user, existing.userId)) throw ApiErrors.forbidden();
    if (existing.endTime === null) {
      throw ApiErrors.conflict(
        "TIMER_RUNNING",
        "Stop the running timer before editing",
      );
    }

    const nextStart = input.startTime
      ? new Date(input.startTime)
      : existing.startTime;
    const nextEnd = input.endTime ? new Date(input.endTime) : existing.endTime!;
    const nextTaskId = input.taskId ?? existing.taskId;

    if (input.startTime || input.endTime) {
      assertManualWindow(nextStart, nextEnd);
      await assertNoOverlap(existing.userId, nextStart, nextEnd, id);
    }

    if (input.taskId && input.taskId !== existing.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: input.taskId },
        select: { id: true, isArchived: true },
      });
      if (!task) throw ApiErrors.notFound("Task not found");
      if (task.isArchived) {
        throw ApiErrors.conflict(
          "TASK_ARCHIVED",
          "Can't move entry to an archived task",
        );
      }
    }

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(input.taskId !== undefined ? { taskId: nextTaskId } : {}),
        ...(input.startTime !== undefined ? { startTime: nextStart } : {}),
        ...(input.endTime !== undefined ? { endTime: nextEnd } : {}),
        ...(input.note !== undefined ? { note: input.note ?? null } : {}),
        ...(input.startTime || input.endTime
          ? { durationSeconds: computeDurationSeconds(nextStart, nextEnd) }
          : {}),
      },
      select: entrySelect,
    });

    await clickupTimeEntryService.pushEntryUpdate(id);

    return updated;
  },

  async remove(user: SessionUser, id: string) {
    const existing = await prisma.timeEntry.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        endTime: true,
        clickupTimeEntryId: true,
        clickupTeamId: true,
      },
    });
    if (!existing) throw ApiErrors.notFound("Time entry not found");
    if (!canMutateEntry(user, existing.userId)) throw ApiErrors.forbidden();
    if (existing.endTime === null) {
      throw ApiErrors.conflict(
        "TIMER_RUNNING",
        "Stop the running timer before deleting",
      );
    }

    await prisma.timeEntry.delete({ where: { id } });

    if (existing.clickupTimeEntryId && existing.clickupTeamId) {
      await clickupTimeEntryService.pushEntryDelete({
        clickupTimeEntryId: existing.clickupTimeEntryId,
        clickupTeamId: existing.clickupTeamId,
        ownerUserId: existing.userId,
      });
    }

    return { id };
  },
};
