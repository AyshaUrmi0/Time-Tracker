import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { clickupTimeEntryService } from "@/server/services/clickup-time-entry.service";
import type { SessionUser } from "@/types";
import type { StartTimerInput } from "@/features/timer/timer.schema";

const timerInclude = {
  task: { select: { id: true, title: true, status: true } },
} as const;

function computeDurationSeconds(startTime: Date, endTime: Date): number {
  return Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
}

export const timerService = {
  async getCurrent(user: SessionUser) {
    const local = await prisma.timeEntry.findFirst({
      where: { userId: user.userId, endTime: null },
      include: timerInclude,
    });
    if (local) return local;

    const adopted = await clickupTimeEntryService.adoptRunningClickUpTimer(
      user.userId,
    );
    if (!adopted) return null;
    return prisma.timeEntry.findUnique({
      where: { id: adopted.id },
      include: timerInclude,
    });
  },

  async start(user: SessionUser, input: StartTimerInput) {
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
        await clickupTimeEntryService.pushOnStop(result.stoppedPrevious.id);
      }
      await clickupTimeEntryService.pushTimerStart(result.timer.id);
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

  async stop(user: SessionUser) {
    const running = await prisma.timeEntry.findFirst({
      where: { userId: user.userId, endTime: null },
    });
    if (!running) throw ApiErrors.noActiveTimer();

    const now = new Date();
    const stopped = await prisma.timeEntry.update({
      where: { id: running.id },
      data: {
        endTime: now,
        durationSeconds: computeDurationSeconds(running.startTime, now),
      },
      include: timerInclude,
    });

    await clickupTimeEntryService.pushOnStop(stopped.id);

    return stopped;
  },
};
