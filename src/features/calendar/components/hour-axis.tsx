"use client";

import { formatHourLabel } from "./format";

type Props = {
  startHour: number;
  endHour: number;
  hourHeight: number;
};

export function HourAxis({ startHour, endHour, hourHeight }: Props) {
  const hours = endHour - startHour;
  return (
    <div className="border-r border-[var(--border)] bg-[var(--surface)]">
      {Array.from({ length: hours }).map((_, i) => (
        <div
          key={i}
          className="relative border-b border-dashed border-[var(--border)] text-right"
          style={{ height: hourHeight }}
        >
          <span className="tabular absolute -top-2 right-2 bg-[var(--surface)] px-1 text-[12px] font-medium text-[var(--text-muted)]">
            {formatHourLabel(startHour + i)}
          </span>
        </div>
      ))}
    </div>
  );
}
