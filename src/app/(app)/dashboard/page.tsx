"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/features/dashboard/dashboard.queries";
import { useSelectableUsers } from "@/features/users/users.queries";
import { KpiTile } from "@/features/dashboard/components/kpi-tile";
import { TopTasks } from "@/features/dashboard/components/top-tasks";
import { RecentEntries } from "@/features/dashboard/components/recent-entries";
import { RunningTimers } from "@/features/dashboard/components/running-timers";
import { ScopeFilter } from "@/features/dashboard/components/scope-filter";
import { formatDurationSec } from "@/features/dashboard/components/format";
import {
  DateRangePicker,
  computePresetRange,
  type DatePreset,
} from "@/features/reports/components/date-range-picker";
import { DayTimeline } from "@/features/reports/components/day-timeline";
import { todayInTimezone } from "@/features/reports/components/format";
import { useReportSummary } from "@/features/reports/reports.queries";

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const isAdmin = session?.user?.role === "ADMIN";
  const tz =
    session?.user?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [adminView, setAdminView] = useState<string>("team");
  const usersQuery = useSelectableUsers();

  const initialRange = useMemo(() => {
    const range = computePresetRange("last7", tz)!;
    return { ...range, preset: "last7" as DatePreset };
  }, [tz]);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [preset, setPreset] = useState<DatePreset>(initialRange.preset);

  const userIdForQuery = useMemo(() => {
    if (!isAdmin) return undefined;
    if (adminView === "team") return undefined;
    return adminView;
  }, [isAdmin, adminView]);

  const summaryQuery = useDashboardSummary(userIdForQuery);
  const summary = summaryQuery.data;

  const activityQuery = useReportSummary({
    from,
    to,
    groupBy: "day",
    userId: userIdForQuery,
  });
  const todayYmd = todayInTimezone(tz);

  function handleRangeChange(next: {
    from: string;
    to: string;
    preset: DatePreset;
  }) {
    setFrom(next.from);
    setTo(next.to);
    setPreset(next.preset);
  }

  const viewingLabel = useMemo(() => {
    if (!isAdmin || adminView === "team") return null;
    const viewedUser = usersQuery.data?.find((u) => u.id === adminView);
    return viewedUser?.name ?? null;
  }, [isAdmin, adminView, usersQuery.data]);

  const isTeamView = summary?.scope === "team";
  const topTasksCount = summary?.topTasks.length ?? 0;

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            {isTeamView
              ? "Team dashboard"
              : viewingLabel
                ? `${viewingLabel}'s dashboard`
                : `Welcome back, ${userName.split(" ")[0] || userName}`}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            {isTeamView
              ? "Totals and activity across your team."
              : viewingLabel
                ? "Admin view — drilled into this member."
                : "Here's your time tracked this week."}
          </p>
        </div>
        {isAdmin && (
          <ScopeFilter
            value={adminView}
            onChange={setAdminView}
            users={usersQuery.data}
          />
        )}
      </div>

      {summaryQuery.isLoading || !summary ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile
              label="Today"
              value={formatDurationSec(summary.today.seconds)}
              hint={isTeamView ? "All members" : "So far today"}
            />
            <KpiTile
              label="This week"
              value={formatDurationSec(summary.week.seconds)}
              hint="Since Sunday"
            />
            <KpiTile
              label={isTeamView ? "Active timers" : "Tracking now"}
              value={
                summary.runningTimers.length > 0 ? (
                  <span className="text-[var(--accent-hover)]">
                    {summary.runningTimers.length}
                  </span>
                ) : (
                  <span className="text-[var(--text-muted)]">0</span>
                )
              }
              hint={
                summary.runningTimers.length > 0
                  ? isTeamView
                    ? `${summary.runningTimers.length} ${summary.runningTimers.length === 1 ? "person" : "people"} tracking`
                    : summary.runningTimers[0]?.task.title
                  : "No running timers"
              }
            />
            <KpiTile
              label="Tasks tracked"
              value={topTasksCount}
              hint="This week"
            />
          </div>

          {summary.runningTimers.length > 0 && (
            <RunningTimers
              timers={summary.runningTimers}
              showUser={isTeamView}
            />
          )}

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Activity
              </h2>
              <DateRangePicker
                timezone={tz}
                from={from}
                to={to}
                preset={preset}
                onChange={handleRangeChange}
              />
            </div>
            {activityQuery.data ? (
              <DayTimeline
                buckets={activityQuery.data.buckets}
                todayYmd={todayYmd}
              />
            ) : (
              <Skeleton className="h-[280px] w-full" />
            )}
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TopTasks tasks={summary.topTasks} />
            <RecentEntries
              entries={summary.recentEntries}
              showUser={isTeamView}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[100px] w-full" />
        ))}
      </div>
      <Skeleton className="h-[180px] w-full" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Skeleton className="h-[280px] w-full" />
        <Skeleton className="h-[280px] w-full" />
      </div>
    </div>
  );
}
