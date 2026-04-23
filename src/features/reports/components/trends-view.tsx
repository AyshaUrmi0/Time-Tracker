"use client";

import { useReportSummary } from "../reports.queries";
import { Skeleton } from "@/components/ui/skeleton";
import {
  addDaysYmd,
  daysBetween,
  formatDurationSec,
  rangeLabel,
} from "./format";

type Props = {
  from: string;
  to: string;
  userId?: string;
};

export function TrendsView({ from, to, userId }: Props) {
  const days = daysBetween(from, to);

  const prevTo = addDaysYmd(from, -1);
  const prevFrom = addDaysYmd(prevTo, -(days - 1));

  const currentQuery = useReportSummary({
    from,
    to,
    groupBy: "day",
    userId,
  });
  const prevQuery = useReportSummary({
    from: prevFrom,
    to: prevTo,
    groupBy: "day",
    userId,
  });

  const current = currentQuery.data;
  const prev = prevQuery.data;
  const loading = !current || !prev;

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[110px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const currentSec = current.total.seconds;
  const prevSec = prev.total.seconds;
  const currentEntries = current.total.entries;
  const prevEntries = prev.total.entries;
  const currentAvg = days > 0 ? currentSec / days : 0;
  const prevAvg = days > 0 ? prevSec / days : 0;

  const deltas = [
    {
      label: "Total Hours",
      current: formatDurationSec(currentSec),
      previous: formatDurationSec(prevSec),
      change: calcChange(currentSec, prevSec),
    },
    {
      label: "Avg / Day",
      current: formatDurationSec(Math.round(currentAvg)),
      previous: formatDurationSec(Math.round(prevAvg)),
      change: calcChange(currentAvg, prevAvg),
    },
    {
      label: "Entries",
      current: String(currentEntries),
      previous: String(prevEntries),
      change: calcChange(currentEntries, prevEntries),
    },
  ];

  const maxSec = Math.max(
    ...current.buckets.map((b) => b.seconds),
    ...prev.buckets.map((b) => b.seconds),
    1,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {deltas.map((d) => (
          <DeltaCard key={d.label} {...d} />
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
        <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Period Comparison
          </h2>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
              Current ({rangeLabel(from, to)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
              Previous ({rangeLabel(prevFrom, prevTo)})
            </span>
          </div>
        </header>

        <div className="space-y-2.5">
          <ComparisonRow
            label="Total tracked"
            currentSec={currentSec}
            previousSec={prevSec}
            maxSec={Math.max(currentSec, prevSec, 1)}
          />

          {current.buckets.slice(0, 14).map((bucket, i) => {
            const prevBucket = prev.buckets[i];
            return (
              <ComparisonRow
                key={bucket.key}
                label={bucket.label}
                currentSec={bucket.seconds}
                previousSec={prevBucket?.seconds ?? 0}
                maxSec={maxSec}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeltaCard({
  label,
  current,
  previous,
  change,
}: {
  label: string;
  current: string;
  previous: string;
  change: { pct: number; direction: "up" | "down" | "flat" };
}) {
  const colorClass =
    change.direction === "up"
      ? "text-[var(--success)]"
      : change.direction === "down"
        ? "text-[var(--danger)]"
        : "text-[var(--text-muted)]";

  const arrow =
    change.direction === "up" ? "\u2191" : change.direction === "down" ? "\u2193" : "";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-3">
        <span className="tabular text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
          {current}
        </span>
        <span className={`tabular text-[13px] font-medium ${colorClass}`}>
          {arrow} {change.pct === Infinity ? "new" : `${change.pct.toFixed(0)}%`}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] text-[var(--text-secondary)]">
        vs {previous} previous period
      </p>
    </div>
  );
}

function ComparisonRow({
  label,
  currentSec,
  previousSec,
  maxSec,
}: {
  label: string;
  currentSec: number;
  previousSec: number;
  maxSec: number;
}) {
  const currentPct = maxSec > 0 ? (currentSec / maxSec) * 100 : 0;
  const prevPct = maxSec > 0 ? (previousSec / maxSec) * 100 : 0;

  return (
    <div className="group grid grid-cols-[140px_1fr_80px] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-hover)]">
      <span className="truncate text-[12px] text-[var(--text-secondary)]">
        {label}
      </span>
      <div className="flex flex-col gap-1">
        <div className="flex h-2 items-center">
          <div
            className="h-full rounded-full bg-[var(--accent)]/80 transition-all duration-300"
            style={{ width: `${Math.max(1, currentPct)}%` }}
          />
        </div>
        <div className="flex h-2 items-center">
          <div
            className="h-full rounded-full bg-[var(--border-strong)] transition-all duration-300"
            style={{ width: `${Math.max(1, prevPct)}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col items-end leading-tight">
        <span className="tabular text-[11.5px] font-medium text-[var(--text-primary)]">
          {formatDurationSec(currentSec)}
        </span>
        <span className="tabular text-[10.5px] text-[var(--text-muted)]">
          {formatDurationSec(previousSec)}
        </span>
      </div>
    </div>
  );
}

function calcChange(
  current: number,
  previous: number,
): { pct: number; direction: "up" | "down" | "flat" } {
  if (previous === 0 && current === 0) return { pct: 0, direction: "flat" };
  if (previous === 0) return { pct: Infinity, direction: "up" };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { pct: 0, direction: "flat" };
  return { pct: Math.abs(pct), direction: pct > 0 ? "up" : "down" };
}
