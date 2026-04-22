import type { DashboardActivityDay } from "../types";
import { formatDayOfMonth, formatDurationSec, formatShortDay } from "./format";

type Props = { activity: DashboardActivityDay[] };

export function ActivityChart({ activity }: Props) {
  const max = Math.max(1, ...activity.map((d) => d.seconds));
  const totalSec = activity.reduce((sum, d) => sum + d.seconds, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Last 7 days
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Total {formatDurationSec(totalSec)}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2 h-[140px]">
        {activity.map((day) => {
          const pct = max === 0 ? 0 : (day.seconds / max) * 100;
          const isEmpty = day.seconds === 0;
          return (
            <div
              key={day.date}
              className="group relative flex flex-1 flex-col items-center gap-1.5"
            >
              <div
                className="relative flex w-full flex-1 items-end justify-center"
                title={`${formatDayOfMonth(day.date)} · ${formatDurationSec(day.seconds)}`}
              >
                <div
                  className={
                    "w-full rounded-md transition-colors duration-150 " +
                    (isEmpty
                      ? "bg-[var(--surface-hover)]"
                      : "bg-[var(--accent)] group-hover:bg-[var(--accent-hover)]")
                  }
                  style={{ height: isEmpty ? "4px" : `${Math.max(4, pct)}%` }}
                />
                {!isEmpty && (
                  <span className="tabular pointer-events-none absolute -top-5 text-[10px] font-medium text-[var(--text-secondary)] opacity-0 group-hover:opacity-100">
                    {formatDurationSec(day.seconds)}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {formatShortDay(day.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
