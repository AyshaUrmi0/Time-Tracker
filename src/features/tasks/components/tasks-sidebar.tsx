"use client";

import { cn } from "@/lib/utils";
import type { Task } from "../types";
import type { SessionUser } from "@/types";

export type SidebarView = "all" | "assigned" | "completed";

type Props = {
  value: SidebarView;
  onChange: (next: SidebarView) => void;
  tasks: Task[] | undefined;
  currentUser: Pick<SessionUser, "userId">;
};

function countFor(view: SidebarView, tasks: Task[] | undefined, userId: string): number {
  if (!tasks) return 0;
  if (view === "all") return tasks.filter((t) => !t.isArchived).length;
  if (view === "assigned")
    return tasks.filter((t) => !t.isArchived && t.assignedToId === userId).length;
  return tasks.filter((t) => !t.isArchived && t.status === "DONE").length;
}

export function TasksSidebar({ value, onChange, tasks, currentUser }: Props) {
  const items: Array<{ key: SidebarView; label: string; icon: React.ReactNode }> = [
    {
      key: "all",
      label: "All tasks",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <rect x="3" y="10" width="18" height="4" rx="1" />
          <rect x="3" y="16" width="18" height="4" rx="1" />
        </svg>
      ),
    },
    {
      key: "assigned",
      label: "Assigned to me",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      key: "completed",
      label: "Completed",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden w-[220px] shrink-0 lg:block">
      <nav className="flex flex-col gap-0.5">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Views
        </p>
        {items.map((item) => {
          const active = item.key === value;
          const count = countFor(item.key, tasks, currentUser.userId);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-150",
                active
                  ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">{item.icon}</span>
                {item.label}
              </span>
              <span className="tabular text-[11px] text-[var(--text-muted)]">
                {count}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
