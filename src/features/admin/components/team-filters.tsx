"use client";

import { Input } from "@/components/ui/input";
import type { Role } from "@/types";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  role: Role | "all";
  onRoleChange: (v: Role | "all") => void;
  archived: "false" | "true" | "all";
  onArchivedChange: (v: "false" | "true" | "all") => void;
};

const selectClass =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

export function TeamFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  archived,
  onArchivedChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search name or email"
        className="h-9 max-w-xs"
      />
      <select
        aria-label="Role filter"
        value={role}
        onChange={(e) => onRoleChange(e.target.value as Role | "all")}
        className={selectClass}
      >
        <option value="all">All roles</option>
        <option value="ADMIN">Admins</option>
        <option value="MEMBER">Members</option>
      </select>
      <select
        aria-label="Archived filter"
        value={archived}
        onChange={(e) =>
          onArchivedChange(e.target.value as "false" | "true" | "all")
        }
        className={selectClass}
      >
        <option value="false">Active</option>
        <option value="true">Archived</option>
        <option value="all">All</option>
      </select>
    </div>
  );
}
