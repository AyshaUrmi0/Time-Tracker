"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelectableUsers } from "@/features/users/users.queries";
import { useTasks } from "@/features/tasks/tasks.queries";
import { useTimeEntries } from "@/features/time-entries/time-entries.queries";
import type { TimeEntry } from "@/features/time-entries/types";
import { useReportSummary } from "@/features/reports/reports.queries";
import { DateRangePicker } from "@/features/reports/components/date-range-picker";
import type { DatePreset } from "@/features/reports/components/date-range-picker";
import { computePresetRange } from "@/features/reports/components/date-range-picker";
import { ReportTabs } from "@/features/reports/components/report-tabs";
import type { ReportTab } from "@/features/reports/components/report-tabs";
import { ScopeFilter } from "@/features/reports/components/scope-filter";
import { DayTimeline } from "@/features/reports/components/day-timeline";
import { BucketList } from "@/features/reports/components/bucket-list";
import { TrendsView } from "@/features/reports/components/trends-view";
import {
  ExportMenu,
  ShareButton,
} from "@/features/reports/components/export-menu";
import {
  formatDurationSec,
  daysBetween,
  todayInTimezone,
} from "@/features/reports/components/format";
import type { ReportGroupBy } from "@/features/reports/types";
import { useDocumentTitle } from "@/lib/use-document-title";

type EntryTypeFilter = "all" | "timer" | "manual";

export default function ReportsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const tz =
    session?.user?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const initial = useMemo(() => {
    const range = computePresetRange("last7", tz)!;
    return { ...range, preset: "last7" as DatePreset };
  }, [tz]);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [preset, setPreset] = useState<DatePreset>(initial.preset);
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const [adminView, setAdminView] = useState<string>("team");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryTypeFilter>("all");

  const usersQuery = useSelectableUsers();
  const tasksQuery = useTasks({ archived: "false" });

  const userIdForQuery = useMemo(() => {
    if (!isAdmin) return undefined;
    if (adminView === "team") return undefined;
    return adminView;
  }, [isAdmin, adminView]);

  const taskExists = useMemo(
    () => (tasksQuery.data ?? []).some((task) => task.id === taskFilter),
    [tasksQuery.data, taskFilter],
  );
  const taskIdForQuery =
    taskFilter === "all" || !taskExists ? undefined : taskFilter;
  const entryTypeForQuery = entryTypeFilter === "all" ? undefined : entryTypeFilter;

  const groupBy: ReportGroupBy = "day";

  const daySummaryQuery = useReportSummary({
    from,
    to,
    groupBy,
    userId: userIdForQuery,
    taskId: taskIdForQuery,
    entryType: entryTypeForQuery,
  });
  const taskSummaryQuery = useReportSummary({
    from,
    to,
    groupBy: "task",
    userId: userIdForQuery,
    taskId: taskIdForQuery,
    entryType: entryTypeForQuery,
  });
  const memberSummaryQuery = useReportSummary(
    {
      from,
      to,
      groupBy: "user",
      userId: undefined,
      taskId: taskIdForQuery,
      entryType: entryTypeForQuery,
    },
    { enabled: Boolean(isAdmin) && adminView === "team" },
  );

  const entriesQuery = useTimeEntries({
    from: `${from}T00:00:00.000Z`,
    to: `${to}T23:59:59.999Z`,
    userId: userIdForQuery,
    taskId: taskIdForQuery,
  });

  const daySummary = daySummaryQuery.data;
  const taskSummary = taskSummaryQuery.data;
  const memberSummary = memberSummaryQuery.data;
  const isStale =
    daySummaryQuery.isPlaceholderData ||
    taskSummaryQuery.isPlaceholderData ||
    daySummaryQuery.isFetching ||
    taskSummaryQuery.isFetching;

  const todayYmd = todayInTimezone(tz);
  const days = daysBetween(from, to);

  function handleRangeChange(next: {
    from: string;
    to: string;
    preset: DatePreset;
  }) {
    setFrom(next.from);
    setTo(next.to);
    setPreset(next.preset);
  }

  function handleScopeChange(next: string) {
    setAdminView(next);
  }

  function handleWiderRange() {
    const wider = computePresetRange("last30", tz)!;
    setFrom(wider.from);
    setTo(wider.to);
    setPreset("last30");
  }

  const visibleEntries = useMemo(() => {
    const base = entriesQuery.data ?? [];
    return base
      .filter((entry) =>
        entryTypeFilter === "all"
          ? true
          : entryTypeFilter === "manual"
            ? entry.isManual
            : !entry.isManual,
      )
      .slice(0, 10);
  }, [entriesQuery.data, entryTypeFilter]);

  const summaryMetrics = useMemo(() => {
    const totalSeconds = daySummary?.total.seconds ?? 0;
    const totalEntries = daySummary?.total.entries ?? 0;
    const avgPerDay = days > 0 ? Math.round(totalSeconds / days) : 0;
    const mostTrackedTask = taskSummary?.buckets[0]?.label ?? "No data";
    const activeDays =
      daySummary?.buckets.filter((b) => b.seconds > 0).length ?? 0;
    const activeMembers =
      memberSummary?.buckets.filter((b) => b.seconds > 0).length ??
      (daySummary?.scope === "user" && totalSeconds > 0 ? 1 : 0);
    return {
      totalSeconds,
      totalEntries,
      avgPerDay,
      mostTrackedTask,
      activeDays,
      activeMembers,
    };
  }, [daySummary, taskSummary, memberSummary, days]);

  useDocumentTitle(`Reports | Time Tracker`);

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            Reports &amp; Analytics
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
            Track time allocation and team performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton from={from} to={to} />
          <ExportMenu summary={daySummary} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ReportTabs value={activeTab} onChange={setActiveTab} />
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <ScopeFilter
              value={adminView}
              onChange={handleScopeChange}
              users={usersQuery.data}
            />
          )}
          <DateRangePicker
            timezone={tz}
            from={from}
            to={to}
            preset={preset}
            onChange={handleRangeChange}
          />
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FilterSelect
            label="Task"
            value={taskFilter}
            onChange={setTaskFilter}
            options={[
              { value: "all", label: "All tasks" },
              ...(tasksQuery.data ?? []).map((task) => ({
                value: task.id,
                label: task.title,
              })),
            ]}
          />
          <div className="h-5 w-px bg-[var(--border)]" aria-hidden />
          <FilterSelect
            label="Entry Type"
            value={entryTypeFilter}
            onChange={(v) => setEntryTypeFilter(v as EntryTypeFilter)}
            options={[
              { value: "all", label: "All entries" },
              { value: "timer", label: "Timer only" },
              { value: "manual", label: "Manual only" },
            ]}
          />
        </div>
      </div>

      {activeTab === "trends" ? (
        <TrendsView from={from} to={to} userId={userIdForQuery} />
      ) : !daySummary || !taskSummary ? (
        <ReportsSkeleton />
      ) : (
        <div
          className={`flex flex-col gap-5 transition-opacity duration-150 ${
            isStale ? "opacity-70" : "opacity-100"
          }`}
        >
          <section>
            <TopSummaryCards
              totalSeconds={summaryMetrics.totalSeconds}
              totalEntries={summaryMetrics.totalEntries}
              avgPerDay={summaryMetrics.avgPerDay}
              mostTrackedTask={summaryMetrics.mostTrackedTask}
              activeMembers={summaryMetrics.activeMembers}
              activeDays={summaryMetrics.activeDays}
            />
          </section>

          {summaryMetrics.totalSeconds === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
              <EmptyState
                title="No tracked data for this report"
                description="Try a wider range, remove filters, or switch member scope. Once data exists, charts and tables will appear here automatically."
                action={
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleWiderRange}
                    >
                      Try last 30 days
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <>
              <section>
                <DayTimeline buckets={daySummary.buckets} todayYmd={todayYmd} />
              </section>

              <div
                className={`grid grid-cols-1 gap-5 ${
                  isAdmin && adminView === "team" && memberSummary
                    ? "lg:grid-cols-2"
                    : ""
                }`}
              >
                <section>
                  <SectionHeader
                    title="Top tasks"
                    hint={`${taskSummary.buckets.length} task${taskSummary.buckets.length === 1 ? "" : "s"}`}
                  />
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
                    <BucketList
                      buckets={taskSummary.buckets.slice(0, 8)}
                      groupBy="task"
                      totalSeconds={taskSummary.total.seconds}
                    />
                  </div>
                </section>

                {isAdmin && adminView === "team" && memberSummary && (
                  <section>
                    <SectionHeader
                      title="Team member summary"
                      hint={`${memberSummary.buckets.length} member${memberSummary.buckets.length === 1 ? "" : "s"}`}
                    />
                    <TeamMemberSummary
                      buckets={memberSummary.buckets}
                      totalSeconds={memberSummary.total.seconds}
                    />
                  </section>
                )}
              </div>

              <section>
                <SectionHeader
                  title="Recent entries"
                  hint={`Showing ${visibleEntries.length} latest`}
                />
                <RecentEntriesTable
                  entries={visibleEntries}
                  isAdmin={Boolean(isAdmin)}
                />
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[90px] w-full" />
        ))}
      </div>
      <Skeleton className="h-[280px] w-full" />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </span>
      <label className="relative min-w-[220px]">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-3 pr-9 text-[13px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-all duration-150 hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-muted)]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </label>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      {hint && (
        <span className="text-[11px] text-[var(--text-muted)]">{hint}</span>
      )}
    </div>
  );
}

type CardIcon = "clock" | "calendar" | "list" | "star" | "users" | "activity";

function MetricIcon({ name }: { name: CardIcon }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "clock":
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "list":
      return (
        <svg {...common} aria-hidden>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} aria-hidden>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "users":
      return (
        <svg {...common} aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common} aria-hidden>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
  }
}

function TopSummaryCards({
  totalSeconds,
  totalEntries,
  avgPerDay,
  mostTrackedTask,
  activeMembers,
  activeDays,
}: {
  totalSeconds: number;
  totalEntries: number;
  avgPerDay: number;
  mostTrackedTask: string;
  activeMembers: number;
  activeDays: number;
}) {
  const cards: {
    label: string;
    value: string;
    hint: string;
    icon: CardIcon;
  }[] = [
    {
      label: "Total tracked",
      value: formatDurationSec(totalSeconds),
      hint: "Across selected range",
      icon: "clock",
    },
    {
      label: "Avg per day",
      value: formatDurationSec(avgPerDay),
      hint: "Daily average",
      icon: "activity",
    },
    {
      label: "Entries",
      value: String(totalEntries),
      hint: "Tracked entries",
      icon: "list",
    },
    {
      label: "Most tracked task",
      value: mostTrackedTask,
      hint: "Highest duration task",
      icon: "star",
    },
    {
      label: "Active members",
      value: String(activeMembers),
      hint: "Members with tracked time",
      icon: "users",
    },
    {
      label: "Active days",
      value: String(activeDays),
      hint: "Days with any tracked time",
      icon: "calendar",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-colors duration-150 hover:border-[var(--border-strong)]"
        >
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-hover)]">
            <MetricIcon name={card.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {card.label}
            </p>
            <p className="mt-0.5 tabular truncate text-[20px] font-semibold tracking-tight text-[var(--text-primary)]">
              {card.value}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-secondary)]">
              {card.hint}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamMemberSummary({
  buckets,
  totalSeconds,
}: {
  buckets: { key: string; label: string; seconds: number; entries: number }[];
  totalSeconds: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <ul className="divide-y divide-[var(--border)]">
        {buckets.slice(0, 8).map((bucket) => {
          const pct = totalSeconds > 0 ? (bucket.seconds / totalSeconds) * 100 : 0;
          return (
            <li key={bucket.key} className="px-4 py-3">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-[var(--text-primary)]">{bucket.label}</span>
                <span className="tabular text-[12px] text-[var(--text-secondary)]">
                  {formatDurationSec(bucket.seconds)} · {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-hover)]">
                <div
                  className="h-2 rounded-full bg-[var(--accent-hover)]"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RecentEntriesTable({
  entries,
  isAdmin,
  compact = false,
}: {
  entries: TimeEntry[];
  isAdmin: boolean;
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
        <p className="text-[13px] text-[var(--text-secondary)]">
          No recent entries for the selected filters.
        </p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[var(--surface-hover)]">
          <tr className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
            <th className="px-4 py-2.5">Task</th>
            {isAdmin && <th className="px-4 py-2.5">Member</th>}
            <th className="px-4 py-2.5">Type</th>
            {!compact && <th className="px-4 py-2.5">Date</th>}
            <th className="px-4 py-2.5 text-right">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] text-[13px]">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-[var(--surface-hover)]">
              <td className="px-4 py-2.5 text-[var(--text-primary)]">{entry.task.title}</td>
              {isAdmin && <td className="px-4 py-2.5 text-[var(--text-secondary)]">{entry.user.name}</td>}
              <td className="px-4 py-2.5">
                <Badge tone={entry.isManual ? "warning" : "info"}>
                  {entry.isManual ? "Manual" : "Timer"}
                </Badge>
              </td>
              {!compact && (
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                  {new Date(entry.startTime).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
              )}
              <td className="tabular px-4 py-2.5 text-right font-medium text-[var(--text-primary)]">
                {formatDurationSec(entry.durationSeconds ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
