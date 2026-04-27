import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
};

export function KpiTile({ label, value, hint, icon }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {label}
        </span>
        {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
      </div>
      <div className="tabular mt-2 text-[26px] font-semibold tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
          {hint}
        </div>
      )}
    </div>
  );
}
