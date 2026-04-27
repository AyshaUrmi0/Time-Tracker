"use client";

import type { SelectableUser } from "@/features/users/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  users: SelectableUser[] | undefined;
};

export function ScopeFilter({ value, onChange, users }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--accent-soft)]/50 px-4 py-2">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Admin Filters:
      </span>

      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 shadow-[var(--shadow-sm)]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--text-muted)]"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 appearance-none bg-transparent py-1 pr-4 text-[13px] font-medium text-[var(--text-primary)] focus:outline-none"
        >
          <option value="team">All Members</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 opacity-50 shadow-[var(--shadow-sm)]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[var(--text-muted)]"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <select
          disabled
          className="h-8 cursor-not-allowed appearance-none bg-transparent py-1 pr-4 text-[13px] font-medium text-[var(--text-primary)] focus:outline-none"
        >
          <option>All Teams</option>
        </select>
      </div>
    </div>
  );
}
