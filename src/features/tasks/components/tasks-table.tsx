"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import type { Task } from "../types";

type Props = {
  tasks: Task[];
  currentUserId: string;
  isAdmin: boolean;
  onEdit: (task: Task) => void;
  onArchive: (task: Task) => void;
};

function canOwn(task: Task, currentUserId: string, isAdmin: boolean) {
  return isAdmin || task.createdById === currentUserId;
}

function canEdit(task: Task, currentUserId: string, isAdmin: boolean) {
  return (
    canOwn(task, currentUserId, isAdmin) || task.assignedToId === currentUserId
  );
}

export function TasksTable({ tasks, currentUserId, isAdmin, onEdit, onArchive }: Props) {
  return (
    <div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <th className="px-4 py-2.5 text-left">Title</th>
            <th className="px-4 py-2.5 text-left">Status</th>
            <th className="px-4 py-2.5 text-left">Assignee</th>
            <th className="px-4 py-2.5 text-left">Created by</th>
            <th className="px-4 py-2.5 text-left">Updated</th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              canEdit={canEdit(task, currentUserId, isAdmin)}
              canOwn={canOwn(task, currentUserId, isAdmin)}
              onEdit={() => onEdit(task)}
              onArchive={() => onArchive(task)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskRow({
  task,
  canEdit,
  canOwn,
  onEdit,
  onArchive,
}: {
  task: Task;
  canEdit: boolean;
  canOwn: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <tr
      className="text-[13px] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
      data-archived={task.isArchived}
    >
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onEdit}
          className="text-left font-medium text-[var(--text-primary)] hover:text-[var(--accent-hover)]"
        >
          {task.title}
        </button>
        {task.isArchived && (
          <Badge tone="muted" className="ml-2">
            Archived
          </Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-4 py-3">
        {task.assignedTo ? (
          <span className="inline-flex items-center gap-2">
            <Avatar name={task.assignedTo.name} id={task.assignedTo.id} size={22} />
            <span className="text-[var(--text-secondary)]">{task.assignedTo.name}</span>
          </span>
        ) : (
          <span className="italic text-[var(--text-muted)]">Unassigned</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--text-secondary)]">{task.createdBy.name}</td>
      <td className="px-4 py-3 text-[var(--text-muted)]">
        {formatDistanceToNowStrict(new Date(task.updatedAt), { addSuffix: true })}
      </td>
      <td className="px-4 py-3 text-right">
        {canEdit && !task.isArchived && (
          <RowActionsMenu
            onEdit={onEdit}
            onArchive={canOwn ? onArchive : undefined}
          />
        )}
        {!canEdit && !task.isArchived && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            View
          </Button>
        )}
      </td>
    </tr>
  );
}

const MENU_WIDTH = 160;
const MENU_HEIGHT = 80;
const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;

function RowActionsMenu({
  onEdit,
  onArchive,
}: {
  onEdit: () => void;
  onArchive?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < MENU_HEIGHT + MENU_GAP + VIEWPORT_PADDING;

      let left = rect.right - MENU_WIDTH;
      left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING));

      const top = openUp
        ? rect.top - MENU_HEIGHT - MENU_GAP
        : rect.bottom + MENU_GAP;

      setPos({ top, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        type="button"
        className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] data-[open=true]:bg-[var(--surface-hover)] data-[open=true]:text-[var(--text-primary)]"
        data-open={open}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>

      {mounted && open && pos &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              role="menu"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: MENU_WIDTH,
              }}
              className="z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                className="block w-full px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                Edit
              </button>
              {onArchive && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onArchive();
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                >
                  Archive
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
