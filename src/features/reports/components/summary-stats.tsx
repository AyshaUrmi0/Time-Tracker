"use client";

import type { ReactNode } from "react";
import { formatDurationSec } from "./format";

type Props = {
  totalSeconds: number;
  totalEntries: number;
  days: number;
  scope: "user" | "team";
};

export function SummaryStats({
  totalSeconds,
  totalEntries,
  days,
  scope,
}: Props) {
  const avgPerDay = days > 0 ? totalSeconds / days : 0;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        label="Total tracked"
        value={formatDurationSec(totalSeconds)}
        hint={`over ${days} ${days === 1 ? "day" : "days"}`}
      />
      <StatTile
        label="Avg per day"
        value={formatDurationSec(Math.round(avgPerDay))}
        hint={scope === "team" ? "across team" : undefined}
      />
      <StatTile
        label="Entries"
        value={String(totalEntries)}
        hint={totalEntries === 1 ? "one entry" : undefined}
      />
      <StatTile
        label="Scope"
        value={scope === "team" ? "Team" : "Individual"}
        hint={
          scope === "team" ? "all members" : "one person"
        }
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-sm)]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 tabular text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11.5px] text-[var(--text-secondary)]">
          {hint}
        </p>
      )}
    </div>
  );
}
