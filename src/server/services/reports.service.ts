import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { formatInUserTimezone } from "@/lib/dates";
import { ApiErrors } from "@/lib/api-error";
import type { SessionUser } from "@/types";
import type { ReportSummaryQuery } from "@/features/reports/reports.schema";
import type {
  ReportBucket,
  ReportScope,
  ReportSummary,
} from "@/features/reports/types";

function nextLocalMidnight(instant: Date, tz: string): Date {
  const ymd = formatInUserTimezone(instant, tz, "yyyy-MM-dd");
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + 1));
  const nextYmd = `${next.getUTCFullYear()}-${String(
    next.getUTCMonth() + 1,
  ).padStart(
    2,
    "0",
  )}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return fromZonedTime(`${nextYmd}T00:00:00`, tz);
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}
function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

type BucketAcc = Omit<ReportBucket, "label">;

function addSeconds(
  map: Map<string, BucketAcc>,
  key: string,
  seconds: number,
  meta: Partial<BucketAcc>,
) {
  const existing = map.get(key);
  if (existing) {
    existing.seconds += seconds;
    existing.entries += 1;
    return;
  }
  map.set(key, {
    key,
    seconds,
    entries: 1,
    ...meta,
  });
}

export const reportsService = {
  async summary(
    user: SessionUser,
    query: ReportSummaryQuery,
  ): Promise<ReportSummary> {
    const isAdmin = user.role === "ADMIN";
    const tz = user.timezone || "UTC";

    if (query.groupBy === "user" && !isAdmin) {
      throw ApiErrors.forbidden(
        "Only admins can group reports by user",
      );
    }

    let scope: ReportScope;
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

    const rangeStart = fromZonedTime(`${query.from}T00:00:00`, tz);
    const rangeEnd = nextLocalMidnight(
      fromZonedTime(`${query.to}T00:00:00`, tz),
      tz,
    );
    const now = new Date();

    const entries = await prisma.timeEntry.findMany({
      where: {
        ...(filterUserId ? { userId: filterUserId } : {}),
        ...(query.taskId ? { taskId: query.taskId } : {}),
        ...(query.entryType
          ? { isManual: query.entryType === "manual" }
          : {}),
        AND: [
          { startTime: { lt: rangeEnd } },
          {
            OR: [
              { endTime: { gt: rangeStart } },
              { endTime: null },
            ],
          },
        ],
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        startTime: true,
        endTime: true,
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const buckets = new Map<string, BucketAcc>();
    let totalSeconds = 0;
    let totalEntries = 0;

    for (const entry of entries) {
      const actualEnd = entry.endTime ?? now;
      const clipStart = maxDate(entry.startTime, rangeStart);
      const clipEnd = minDate(actualEnd, rangeEnd);
      if (clipEnd <= clipStart) continue;

      const clippedSec = Math.max(
        0,
        Math.floor((clipEnd.getTime() - clipStart.getTime()) / 1000),
      );
      if (clippedSec === 0) continue;

      totalSeconds += clippedSec;
      totalEntries += 1;

      if (query.groupBy === "day") {
        let segStart = clipStart;
        while (segStart < clipEnd) {
          const nextMid = nextLocalMidnight(segStart, tz);
          const segEnd = nextMid < clipEnd ? nextMid : clipEnd;
          const segSec = Math.max(
            0,
            Math.floor((segEnd.getTime() - segStart.getTime()) / 1000),
          );
          const dayYmd = formatInUserTimezone(segStart, tz, "yyyy-MM-dd");
          addSeconds(buckets, dayYmd, segSec, { date: dayYmd });
          segStart = segEnd;
        }
      } else if (query.groupBy === "task") {
        addSeconds(buckets, entry.taskId, clippedSec, {
          task: {
            id: entry.task.id,
            title: entry.task.title,
            status: entry.task.status,
          },
        });
      } else {
        addSeconds(buckets, entry.userId, clippedSec, {
          user: { id: entry.user.id, name: entry.user.name },
        });
      }
    }

    if (query.groupBy === "day") {
      let cursor = rangeStart;
      while (cursor < rangeEnd) {
        const dayYmd = formatInUserTimezone(cursor, tz, "yyyy-MM-dd");
        if (!buckets.has(dayYmd)) {
          buckets.set(dayYmd, {
            key: dayYmd,
            seconds: 0,
            entries: 0,
            date: dayYmd,
          });
        }
        cursor = nextLocalMidnight(cursor, tz);
      }
    }

    const list = Array.from(buckets.values()).map(
      (b): ReportBucket => ({
        ...b,
        label:
          query.groupBy === "day"
            ? (b.date ?? b.key)
            : query.groupBy === "task"
              ? (b.task?.title ?? b.key)
              : (b.user?.name ?? b.key),
      }),
    );

    const sorted =
      query.groupBy === "day"
        ? list.sort((a, b) => a.key.localeCompare(b.key))
        : list.sort((a, b) => b.seconds - a.seconds);

    return {
      scope,
      groupBy: query.groupBy,
      from: query.from,
      to: query.to,
      timezone: tz,
      total: { seconds: totalSeconds, entries: totalEntries },
      buckets: sorted,
    };
  },
};
