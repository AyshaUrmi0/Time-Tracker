"use client";

import type { ReportGroupBy } from "../types";

type Option = { value: ReportGroupBy; label: string };

type Props = {
  value: ReportGroupBy;
  onChange: (next: ReportGroupBy) => void;
  showUser: boolean;
};

export function GroupByTabs({ value, onChange, showUser }: Props) {
  const options: Option[] = [
    { value: "day", label: "By day" },
    { value: "task", label: "By task" },
    ...(showUser ? [{ value: "user" as const, label: "By user" }] : []),
  ];

  return (
    <div
      role="tablist"
      aria-label="Group by"
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-sm)]"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`h-8 rounded-md px-3 text-[12.5px] font-medium transition-colors duration-150 ${
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent-hover)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
