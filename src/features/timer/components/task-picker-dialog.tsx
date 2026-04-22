"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/features/tasks/components/status-badge";
import { useTasks } from "@/features/tasks/tasks.queries";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (taskId: string) => void;
  currentTaskId?: string | null;
};

export function TaskPickerDialog({ open, onClose, onSelect, currentTaskId }: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const tasksQuery = useTasks({ archived: "false" });

  const filtered = useMemo(() => {
    const all = tasksQuery.data ?? [];
    const active = all.filter((t) => !t.isArchived);
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasksQuery.data, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  useEffect(() => {
    if (cursor >= filtered.length) setCursor(0);
  }, [filtered.length, cursor]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[cursor];
      if (target) onSelect(target.id);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Start timer"
      description="Pick a task to track time against."
      size="md"
    >
      <Input
        autoFocus
        placeholder="Search tasks…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCursor(0);
        }}
        onKeyDown={onKeyDown}
      />

      <div className="mt-3 max-h-[320px] overflow-y-auto rounded-lg border border-[var(--border)]">
        {tasksQuery.isLoading ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
            {query
              ? `No tasks match "${query}".`
              : "No active tasks. Create one first."}
          </div>
        ) : (
          <ul role="listbox" className="divide-y divide-[var(--border)]">
            {filtered.map((task, idx) => {
              const active = idx === cursor;
              const isCurrent = task.id === currentTaskId;
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(task.id)}
                    onMouseEnter={() => setCursor(idx)}
                    aria-selected={active}
                    className={
                      "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 " +
                      (active
                        ? "bg-[var(--surface-hover)]"
                        : "hover:bg-[var(--surface-hover)]")
                    }
                  >
                    <StatusBadge status={task.status} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">
                      {task.title}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        tracking
                      </span>
                    )}
                    {task.assignedTo ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <Avatar
                          name={task.assignedTo.name}
                          id={task.assignedTo.id}
                          size={18}
                        />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        ↑/↓ to navigate, Enter to start, Esc to close.
      </p>
    </Dialog>
  );
}
