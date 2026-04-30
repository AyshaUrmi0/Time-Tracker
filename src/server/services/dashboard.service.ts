import { prisma } from "@/lib/prisma";
import {
  getUserDayStart,
  getUserDayEnd,
  getUserWeekStart,
  formatInUserTimezone,
} from "@/lib/dates";
import { ApiErrors } from "@/lib/api-error";
import type { SessionUser } from "@/types";
import type { DashboardSummaryQuery } from "@/features/dashboard/dashboard.schema";
import type {
  DashboardActivityDay,
  DashboardRecentEntry,
  DashboardRunningTimer,
  DashboardScope,
  DashboardSummary,
  DashboardTopTask,
} from "@/features/dashboard/types";

const ACTIVITY_DAYS = 7;
const RECENT_LIMIT = 10;
const TOP_TASKS_LIMIT = 5;

function portionInWindow(
  start: Date,
  end: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  const from = start < windowStart ? windowStart : start;
  const to = end > windowEnd ? windowEnd : end;
  if (to <= from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 1000);
}

export const dashboardService = {
  async summary(
    user: SessionUser,
    query: DashboardSummaryQuery,
  ): Promise<DashboardSummary> {
    const isAdmin = user.role === "ADMIN";

    let scope: DashboardScope;
    let filterUserId: string | undefined;

    if (!isAdmin) {
      scope = "user";
      filterUserId = user.userId;
    } else if (query.userId) {
      const target = await prisma.user.findUnique({
        where: { id: query.userId },
        select: { id: true },
      });
      if (!target) throw ApiErrors.notFound("User not found");
      scope = "user";
      filterUserId = query.userId;
    } else {
      scope = "team";
      filterUserId = undefined;
    }

    const now = new Date();
    const tz = user.timezone || "UTC";

    const todayStart = getUserDayStart(now, tz);
    const todayEnd = getUserDayEnd(now, tz);
    const weekStart = getUserWeekStart(now, tz);

    const activityStart = getUserDayStart(
      new Date(now.getTime() - (ACTIVITY_DAYS - 1) * 24 * 60 * 60 * 1000),
      tz,
    );

    const rangeStart = activityStart < weekStart ? activityStart : weekStart;

    const entries = await prisma.timeEntry.findMany({
      where: {
        ...(filterUserId ? { userId: filterUserId } : {}),
        OR: [{ startTime: { gte: rangeStart } }, { endTime: null }],
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        note: true,
        startTime: true,
        endTime: true,
        durationSeconds: true,
        user: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { startTime: "desc" },
    });

    const runningTimers: DashboardRunningTimer[] = [];
    let todaySeconds = 0;
    let weekSeconds = 0;

    const activityBuckets = new Map<string, number>();
    for (let i = ACTIVITY_DAYS - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = formatInUserTimezone(day, tz, "yyyy-MM-dd");
      activityBuckets.set(key, 0);
    }

    const taskTotals = new Map<string, { title: string; seconds: number }>();

    for (const e of entries) {
      const end = e.endTime ?? now;
      const effectiveSeconds =
        e.endTime && e.durationSeconds != null
          ? e.durationSeconds
          : Math.max(0, Math.floor((end.getTime() - e.startTime.getTime()) / 1000));

      if (!e.endTime) {
        runningTimers.push({
          id: e.id,
          startTime: e.startTime.toISOString(),
          user:
            scope === "team"
              ? { id: e.user.id, name: e.user.name, email: e.user.email }
              : undefined,
          task: {
            id: e.task.id,
            title: e.task.title,
            status: e.task.status,
          },
        });
      }

      todaySeconds += portionInWindow(e.startTime, end, todayStart, todayEnd);
      weekSeconds += portionInWindow(e.startTime, end, weekStart, now);

      const dayKey = formatInUserTimezone(e.startTime, tz, "yyyy-MM-dd");
      if (activityBuckets.has(dayKey)) {
        activityBuckets.set(
          dayKey,
          (activityBuckets.get(dayKey) ?? 0) + effectiveSeconds,
        );
      }

      if (e.startTime >= weekStart) {
        const existing = taskTotals.get(e.taskId);
        taskTotals.set(e.taskId, {
          title: e.task.title,
          seconds: (existing?.seconds ?? 0) + effectiveSeconds,
        });
      }
    }

    const activity: DashboardActivityDay[] = Array.from(
      activityBuckets.entries(),
    ).map(([date, seconds]) => ({ date, seconds }));

    const topTasks: DashboardTopTask[] = Array.from(taskTotals.entries())
      .map(([taskId, { title, seconds }]) => ({ taskId, title, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, TOP_TASKS_LIMIT);

    const recentEntries: DashboardRecentEntry[] = entries
      .filter((e) => e.endTime != null)
      .slice(0, RECENT_LIMIT)
      .map((e) => ({
        id: e.id,
        taskId: e.taskId,
        taskTitle: e.task.title,
        note: e.note,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime!.toISOString(),
        durationSeconds: e.durationSeconds ?? 0,
        user:
          scope === "team"
            ? { id: e.user.id, name: e.user.name, email: e.user.email }
            : undefined,
      }));

    return {
      scope,
      today: { seconds: todaySeconds },
      week: { seconds: weekSeconds },
      runningTimers,
      activity,
      recentEntries,
      topTasks,
    };
  },
};
