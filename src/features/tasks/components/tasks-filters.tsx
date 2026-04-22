"use client";

import { Select } from "@/components/ui/select";
import { SegmentedTabs } from "@/components/ui/tabs";
import type { SelectableUser } from "@/features/users/types";
import type { TaskStatus } from "../types";

type Props = {
  status: TaskStatus | "all";
  onStatusChange: (next: TaskStatus | "all") => void;
  assignee: string;
  onAssigneeChange: (next: string) => void;
  archived: "false" | "true" | "all";
  onArchivedChange: (next: "false" | "true" | "all") => void;
  users: SelectableUser[] | undefined;
};

export function TasksFilters({
  status,
  onStatusChange,
  assignee,
  onAssigneeChange,
  archived,
  onArchivedChange,
  users,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Status
        </span>
        <Select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus | "all")}
        >
          <option value="all">All</option>
          <option value="TODO">To do</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="DONE">Done</option>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Assignee
        </span>
        <Select
          value={assignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="unassigned">Unassigned</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Show
        </span>
        <SegmentedTabs
          ariaLabel="Archived filter"
          value={archived}
          onChange={onArchivedChange}
          options={[
            { value: "false", label: "Active" },
            { value: "true", label: "Archived" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
    </div>
  );
}
