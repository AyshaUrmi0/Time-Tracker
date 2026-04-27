"use client";

import type { ReportBucket } from "../types";
import {
  formatDurationSec,
  shortDateLabel,
  weekdayLabel,
} from "./format";

type Props = {
  buckets: ReportBucket[];
  todayYmd: string;
};

function niceCeil(value: number): number {
  if (value <= 0) return 3600;
  const hour = 3600;
  const targets = [hour, 2 * hour, 4 * hour, 8 * hour, 12 * hour, 24 * hour];
  for (const t of targets) {
    if (value <= t) return t;
  }
  const roundedHours = Math.ceil(value / hour / 4) * 4;
  return roundedHours * hour;
}

const CHART_HEIGHT = 200;

export function DayTimeline({ buckets, todayYmd }: Props) {
  const rawMax = buckets.reduce(
    (m, b) => (b.seconds > m ? b.seconds : m),
    0,
  );
  const ceiling = niceCeil(rawMax);
  const totalSec = buckets.reduce((s, b) => s + b.seconds, 0);
  const activeDays = buckets.filter((b) => b.seconds > 0).length;
  const avgPerDay = activeDays > 0 ? Math.round(totalSec / activeDays) : 0;
  const peak = buckets.reduce(
    (best, b) => (b.seconds > best.seconds ? b : best),
    buckets[0] ?? { seconds: 0, key: "", label: "", entries: 0 },
  );

  const dense = buckets.length > 14;
  const gridLines = [1, 0.75, 0.5, 0.25, 0];
  const columns = Math.max(buckets.length, 1);
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Daily breakdown
          </h2>
          <p className="mt-0.5 text-[11.5px] text-[var(--text-secondary)]">
            {buckets.length} {buckets.length === 1 ? "day" : "days"}
            {activeDays > 0 && (
              <>
                {" "}
                · avg{" "}
                <span className="tabular font-medium text-[var(--text-primary)]">
                  {formatDurationSec(avgPerDay)}
                </span>{" "}
                · peak{" "}
                <span className="tabular font-medium text-[var(--text-primary)]">
                  {formatDurationSec(peak.seconds)}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent)]/75" />
            Tracked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--accent-hover)]" />
            Today
          </span>
        </div>
      </header>

      <div className="flex gap-3">
        <div
          className="flex w-11 flex-col justify-between pr-1 text-right text-[10px] tabular text-[var(--text-muted)]"
          style={{ height: CHART_HEIGHT }}
          aria-hidden
        >
          {gridLines.map((g) => (
            <span key={g} className="leading-none">
              {formatDurationSec(Math.round(ceiling * g))}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
            style={{ height: CHART_HEIGHT }}
            aria-hidden
          >
            {gridLines.map((g, i) => (
              <div
                key={g}
                className={`h-px w-full ${
                  i === gridLines.length - 1
                    ? "bg-[var(--border-strong)]"
                    : "bg-[var(--border)]"
                }`}
              />
            ))}
          </div>

          <div
            className="relative grid gap-1.5"
            style={{ ...gridStyle, height: CHART_HEIGHT }}
          >
            {buckets.map((b) => {
              const pct = ceiling > 0 ? (b.seconds / ceiling) * 100 : 0;
              const isToday = b.key === todayYmd;
              const empty = b.seconds === 0;
              const barHeight = empty ? 3 : Math.max(4, pct);
              const barStyle = empty
                ? { height: "3px" }
                : { height: `${barHeight}%` };
              return (
                <div
                  key={b.key}
                  className="group relative h-full w-full"
                  title={`${shortDateLabel(b.key)} · ${formatDurationSec(b.seconds)}`}
                >
                  <span
                    className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10.5px] font-medium tabular text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-md)] transition-opacity duration-150 group-hover:opacity-100"
                    aria-hidden
                  >
                    {formatDurationSec(b.seconds)}
                  </span>
                  <div
                    className={`absolute inset-x-0 bottom-0 rounded-t-md transition-all duration-150 ${
                      empty
                        ? "bg-[var(--border)]"
                        : isToday
                          ? "bg-[var(--accent-hover)]"
                          : "bg-[var(--accent)]/75 group-hover:bg-[var(--accent)]"
                    }`}
                    style={barStyle}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 grid gap-1.5" style={gridStyle}>
            {buckets.map((b) => {
              const isToday = b.key === todayYmd;
              return (
                <div
                  key={b.key}
                  className={`flex flex-col items-center leading-tight ${
                    isToday
                      ? "text-[var(--accent-hover)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    {weekdayLabel(b.key)}
                  </span>
                  {!dense && (
                    <span className="text-[10.5px] tabular">
                      {shortDateLabel(b.key)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
