"use client";

import type { CalendarDay } from "../types";
import { dayOfMonthLabel, formatDurationSec } from "./format";

type Props = {
  day: CalendarDay;
  isToday: boolean;
  isLast: boolean;
};

export function DayHeader({ day, isToday, isLast }: Props) {
  return (
    <div
      className={`flex flex-col gap-0.5 px-3 py-2.5 ${
        isLast ? "" : "border-r border-[var(--border)]"
      }`}
    >
      <span
        className={`text-[10.5px] font-semibold uppercase tracking-[0.14em] ${
          isToday
            ? "text-[var(--accent-hover)]"
            : "text-[var(--text-muted)]"
        }`}
      >
        {day.weekday}
      </span>
      <div className="flex items-center gap-2">
        {isToday ? (
          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[13px] font-semibold text-white">
            {dayOfMonthLabel(day.date)}
          </span>
        ) : (
          <span className="text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">
            {dayOfMonthLabel(day.date)}
          </span>
        )}
        {day.totalSeconds > 0 && (
          <span className="tabular text-[10.5px] font-medium text-[var(--text-muted)]">
            {formatDurationSec(day.totalSeconds)}
          </span>
        )}
      </div>
    </div>
  );
}
