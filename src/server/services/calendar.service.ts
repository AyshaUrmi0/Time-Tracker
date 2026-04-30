import { prisma } from "@/lib/prisma";
import {
  getUserWeekStart,
  formatInUserTimezone,
} from "@/lib/dates";
import { fromZonedTime } from "date-fns-tz";
import { ApiErrors } from "@/lib/api-error";
import type { SessionUser } from "@/types";
import type { CalendarWeekQuery } from "@/features/calendar/calendar.schema";
import type {
  CalendarDay,
  CalendarEntry,
  CalendarScope,
  CalendarWeek,
} from "@/features/calendar/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const calendarService = {
  async week(
    user: SessionUser,
    query: CalendarWeekQuery,
  ): Promise<CalendarWeek> {
    const isAdmin = user.role === "ADMIN";
    const tz = user.timezone || "UTC";

    let scope: CalendarScope;
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

    const requestedLocalMidnight = fromZonedTime(
      `${query.start}T00:00:00`,
      tz,
    );
    const weekStart = getUserWeekStart(requestedLocalMidnight, tz);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

    const entries = await prisma.timeEntry.findMany({
      where: {
        ...(filterUserId ? { userId: filterUserId } : {}),
        OR: [
          {
            startTime: { gte: weekStart, lt: weekEnd },
          },
          { endTime: null },
        ],
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        note: true,
        startTime: true,
        endTime: true,
        durationSeconds: true,
        isManual: true,
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const days: CalendarDay[] = [];
    const bucketByKey = new Map<string, CalendarDay>();
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart.getTime() + i * DAY_MS);
      const key = formatInUserTimezone(dayDate, tz, "yyyy-MM-dd");
      const day: CalendarDay = {
        date: key,
        weekday: WEEKDAY_LABELS[i]!,
        entries: [],
        totalSeconds: 0,
      };
      days.push(day);
      bucketByKey.set(key, day);
    }

    const now = new Date();
    let weekTotal = 0;

    for (const e of entries) {
      const end = e.endTime ?? now;
      if (end <= weekStart || e.startTime >= weekEnd) continue;

      const dayKey = formatInUserTimezone(e.startTime, tz, "yyyy-MM-dd");
      const bucket = bucketByKey.get(dayKey);
      if (!bucket) continue;

      const seconds =
        e.endTime && e.durationSeconds != null
          ? e.durationSeconds
          : Math.max(
              0,
              Math.floor((end.getTime() - e.startTime.getTime()) / 1000),
            );

      const calendarEntry: CalendarEntry = {
        id: e.id,
        userId: e.userId,
        taskId: e.taskId,
        taskTitle: e.task.title,
        taskStatus: e.task.status,
        note: e.note,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime ? e.endTime.toISOString() : null,
        durationSeconds: e.endTime ? (e.durationSeconds ?? seconds) : null,
        isManual: e.isManual,
        user:
          scope === "team" ? { id: e.user.id, name: e.user.name } : undefined,
      };

      bucket.entries.push(calendarEntry);
      bucket.totalSeconds += seconds;
      weekTotal += seconds;
    }

    return {
      scope,
      weekStart: formatInUserTimezone(weekStart, tz, "yyyy-MM-dd"),
      weekEnd: formatInUserTimezone(
        new Date(weekEnd.getTime() - 1),
        tz,
        "yyyy-MM-dd",
      ),
      timezone: tz,
      days,
      totalSeconds: weekTotal,
    };
  },
};
