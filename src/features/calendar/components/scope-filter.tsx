"use client";

import type { SelectableUser } from "@/features/users/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  users: SelectableUser[] | undefined;
};

export function ScopeFilter({ value, onChange, users }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-sm)]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Viewing
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
      >
        <option value="team">Team</option>
        {users?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
