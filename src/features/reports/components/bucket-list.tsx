"use client";

import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/features/tasks/components/status-badge";
import type { ReportBucket, ReportGroupBy } from "../types";
import { formatDurationSec } from "./format";

type Props = {
  buckets: ReportBucket[];
  groupBy: Exclude<ReportGroupBy, "day">;
  totalSeconds: number;
};

export function BucketList({ buckets, groupBy, totalSeconds }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <header className="flex items-baseline justify-between border-b border-[var(--border)] px-5 py-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          {groupBy === "task" ? "By task" : "By user"}
        </h2>
        <span className="text-[11px] text-[var(--text-muted)]">
          {buckets.length} {buckets.length === 1 ? "result" : "results"}
        </span>
      </header>
      <ul className="divide-y divide-[var(--border)]">
        {buckets.map((b) => {
          const pct = totalSeconds > 0 ? (b.seconds / totalSeconds) * 100 : 0;
          return (
            <li
              key={b.key}
              className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-[var(--surface-hover)]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {groupBy === "user" && b.user && (
                  <Avatar name={b.user.name} id={b.user.id} size={28} />
                )}
                {groupBy === "task" && b.task && (
                  <StatusBadge status={b.task.status} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                    {b.label}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]/80"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end leading-tight">
                <span className="tabular text-[13px] font-semibold text-[var(--text-primary)]">
                  {formatDurationSec(b.seconds)}
                </span>
                <span className="tabular text-[11px] text-[var(--text-muted)]">
                  {pct.toFixed(1)}% · {b.entries}{" "}
                  {b.entries === 1 ? "entry" : "entries"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
