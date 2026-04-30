import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { clickupTimeEntryService } from "@/server/services/clickup-time-entry.service";
import type { SessionUser } from "@/types";
import type { StartTimerInput } from "@/features/timer/timer.schema";

const timerInclude = {
  task: { select: { id: true, title: true, status: true } },
  user: { select: { id: true, name: true } },
} as const;

function computeDurationSeconds(startTime: Date, endTime: Date): number {
  return Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
}

export const timerService = {
  async getCurrent(user: SessionUser) {
    let local = await prisma.timeEntry.findFirst({
      where: { userId: user.userId, endTime: null },
      include: timerInclude,
    });

    if (
      local &&
      local.clickupTimeEntryId !== null &&
      local.clickupTeamId !== null
    ) {
      const taskMeta = await prisma.task.findUnique({
        where: { id: local.taskId },
        select: { clickupTaskId: true },
      });
      const result = await clickupTimeEntryService.syncStaleRunningTimer({
        id: local.id,
        userId: user.userId,
        clickupTimeEntryId: local.clickupTimeEntryId,
        clickupTeamId: local.clickupTeamId,
        clickupTaskId: taskMeta?.clickupTaskId ?? null,
      });
      if (result.syncedStop) {
        local = await prisma.timeEntry.findFirst({
          where: { userId: user.userId, endTime: null },
          include: timerInclude,
        });
      }
    }

    let own = local;
    if (!own) {
      const adopted = await clickupTimeEntryService.adoptRunningClickUpTimer(
        user.userId,
      );
      if (adopted) {
        own = await prisma.timeEntry.findUnique({
          where: { id: adopted.id },
          include: timerInclude,
        });
      }
    }

    const others =
      user.role === "ADMIN"
        ? await prisma.timeEntry.findMany({
            where: {
              endTime: null,
              userId: { not: user.userId },
            },
            include: timerInclude,
            orderBy: { startTime: "desc" },
          })
        : [];

    return { own, others };
  },

  async start(user: SessionUser, input: StartTimerInput) {
    const conn = await prisma.clickUpConnection.findFirst({
      where: { isActive: true, revokedAt: null },
      select: { id: true },
    });
    if (!conn) {
      throw ApiErrors.conflict(
        "CLICKUP_NOT_CONNECTED",
        "ClickUp isn't connected for this workspace yet. Ask your admin to connect it.",
      );
    }

    if (user.role !== "ADMIN") {
      const localUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { clickupUserId: true },
      });
      if (!localUser || localUser.clickupUserId === null) {
        throw ApiErrors.conflict(
          "CLICKUP_NOT_CONNECTED",
          "You're not a member of the connected ClickUp workspace. Ask your admin to invite you.",
        );
      }
    }

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, isArchived: true },
    });
    if (!task) throw ApiErrors.notFound("Task not found");
    if (task.isArchived) {
      throw ApiErrors.conflict(
        "TASK_ARCHIVED",
        "Can't start a timer on an archived task",
      );
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const now = new Date();

          const existing = await tx.timeEntry.findFirst({
            where: { userId: user.userId, endTime: null },
            include: timerInclude,
          });

          let stoppedPrevious = null;
          if (existing) {
            stoppedPrevious = await tx.timeEntry.update({
              where: { id: existing.id },
              data: {
                endTime: now,
                durationSeconds: computeDurationSeconds(existing.startTime, now),
              },
              include: timerInclude,
            });
          }

          const timer = await tx.timeEntry.create({
            data: {
              userId: user.userId,
              taskId: input.taskId,
              note: input.note ?? null,
              startTime: now,
            },
            include: timerInclude,
          });

          return { timer, stoppedPrevious };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (result.stoppedPrevious) {
        void clickupTimeEntryService.pushOnStop(result.stoppedPrevious.id);
      }
      void clickupTimeEntryService.pushTimerStart(result.timer.id);
      return result;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002" || err.code === "P2034") {
          throw ApiErrors.conflict(
            "TIMER_ALREADY_RUNNING",
            "A timer is already running — stop it first",
          );
        }
      }
      throw err;
    }
  },

  async stop(user: SessionUser, entryId?: string) {
    let running;
    if (entryId) {
      running = await prisma.timeEntry.findUnique({
        where: { id: entryId },
        select: { id: true, userId: true, startTime: true, endTime: true },
      });
      if (!running || running.endTime !== null) throw ApiErrors.noActiveTimer();
      if (running.userId !== user.userId && user.role !== "ADMIN") {
        throw ApiErrors.forbidden();
      }
    } else {
      running = await prisma.timeEntry.findFirst({
        where: { userId: user.userId, endTime: null },
        select: { id: true, userId: true, startTime: true, endTime: true },
      });
      if (!running) throw ApiErrors.noActiveTimer();
    }

    const now = new Date();
    const stopped = await prisma.timeEntry.update({
      where: { id: running.id },
      data: {
        endTime: now,
        durationSeconds: computeDurationSeconds(running.startTime, now),
      },
      include: timerInclude,
    });

    void clickupTimeEntryService.pushOnStop(stopped.id);

    return stopped;
  },
};
