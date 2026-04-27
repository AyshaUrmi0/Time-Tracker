"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  addDaysYmd,
  addMonthsYmd,
  endOfMonthYmd,
  rangeLabel,
  startOfMonthYmd,
  todayInTimezone,
} from "./format";

export type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

type Props = {
  timezone: string;
  from: string;
  to: string;
  preset: DatePreset;
  onChange: (next: { from: string; to: string; preset: DatePreset }) => void;
};

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

export function computePresetRange(
  preset: DatePreset,
  timezone: string,
): { from: string; to: string } | null {
  const today = todayInTimezone(timezone);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDaysYmd(today, -1);
      return { from: y, to: y };
    }
    case "last7":
      return { from: addDaysYmd(today, -6), to: today };
    case "last30":
      return { from: addDaysYmd(today, -29), to: today };
    case "thisMonth":
      return { from: startOfMonthYmd(today), to: today };
    case "lastMonth": {
      const prev = addMonthsYmd(today, -1);
      return { from: startOfMonthYmd(prev), to: endOfMonthYmd(prev) };
    }
    case "custom":
      return null;
  }
}

export function DateRangePicker({
  timezone,
  from,
  to,
  preset,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function selectPreset(p: DatePreset) {
    const range = computePresetRange(p, timezone);
    if (range) {
      onChange({ ...range, preset: p });
    } else {
      onChange({ from, to, preset: p });
    }
    if (p !== "custom") setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[15px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--text-muted)]"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{rangeLabel(from, to)}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--text-muted)]"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[320px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
          <div className="border-b border-[var(--border)] p-2">
            {PRESETS.map((p) => {
              const active = p.value === preset;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => selectPreset(p.value)}
                  className={`flex w-full rounded-md px-3 py-1.5 text-left text-[15px] transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-hover)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 p-3">
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) =>
                onChange({ from: e.target.value, to, preset: "custom" })
              }
              className="h-8 flex-1 text-[14px]"
            />
            <span className="text-[14px] text-[var(--text-muted)]">&ndash;</span>
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(e) =>
                onChange({ from, to: e.target.value, preset: "custom" })
              }
              className="h-8 flex-1 text-[14px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
