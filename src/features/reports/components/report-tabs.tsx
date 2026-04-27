"use client";

export type ReportTab = "summary" | "byTask" | "trends";

type Props = {
  value: ReportTab;
  onChange: (next: ReportTab) => void;
};

const TABS: { value: ReportTab; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "byTask", label: "By Task" },
  { value: "trends", label: "Trends" },
];

export function ReportTabs({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Report view"
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-sm)]"
    >
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`h-8 rounded-md px-4 text-[15px] font-medium transition-colors duration-150 ${
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent-hover)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
