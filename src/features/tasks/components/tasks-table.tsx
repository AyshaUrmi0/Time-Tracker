"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/use-mounted";
import { StatusBadge } from "./status-badge";
import { PRIORITY_LABELS, dueBadge } from "../clickup-task-fields";
import type { Task } from "../types";

type Props = {
  tasks: Task[];
  isAdmin: boolean;
  onEdit: (task: Task) => void;
  onArchive: (task: Task) => void;
};

export function TasksTable({ tasks, isAdmin, onEdit, onArchive }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <th className="px-4 py-2.5 text-left">Title</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left">Assignee</th>
            <th className="hidden whitespace-nowrap px-4 py-2.5 text-left md:table-cell">
              Created by
            </th>
            <th className="hidden whitespace-nowrap px-4 py-2.5 text-left lg:table-cell">
              Updated
            </th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isAdmin={isAdmin}
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
  isAdmin,
  onEdit,
  onArchive,
}: {
  task: Task;
  isAdmin: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <tr
      className="text-[15px] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
      data-archived={task.isArchived}
    >
      <td className="px-4 py-3">
        <span className="inline-flex flex-wrap items-center gap-2">
          <PriorityDot priority={task.clickupPriority} />
          <button
            type="button"
            onClick={onEdit}
            className="text-left font-medium text-[var(--text-primary)] hover:text-[var(--accent-hover)]"
          >
            {task.title}
          </button>
          {task.isArchived && <Badge tone="muted">Archived</Badge>}
          <DueDateBadge iso={task.clickupDueDate} />
          {task.clickupTaskId && <ClickUpLink url={task.clickupUrl} />}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StatusBadge status={task.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {task.assignedTo ? (
          <span className="inline-flex items-center gap-2">
            <Avatar name={task.assignedTo.name} id={task.assignedTo.id} size={22} />
            <span className="text-[var(--text-secondary)]">{task.assignedTo.name}</span>
          </span>
        ) : (
          <span className="italic text-[var(--text-muted)]">Unassigned</span>
        )}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-[var(--text-secondary)] md:table-cell">
        {task.createdBy.name}
      </td>
      <td className="hidden whitespace-nowrap px-4 py-3 text-[var(--text-muted)] lg:table-cell">
        {formatDistanceToNowStrict(new Date(task.updatedAt), { addSuffix: true })}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {isAdmin && !task.isArchived && (
          <RowActionsMenu onEdit={onEdit} onArchive={onArchive} />
        )}
        {!isAdmin && !task.isArchived && (
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

function PriorityDot({ priority }: { priority: number | null }) {
  if (priority === null) return null;
  const meta = PRIORITY_LABELS[priority];
  if (!meta) return null;
  return (
    <span
      aria-label={`Priority: ${meta.label}`}
      title={`Priority: ${meta.label}`}
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: meta.color }}
    />
  );
}

function DueDateBadge({ iso }: { iso: string | null }) {
  if (!iso) return null;
  const badge = dueBadge(iso);
  if (!badge) return null;
  const tone =
    badge.tone === "danger"
      ? "border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]"
      : "border-[var(--warning)]/30 bg-[#fef3c7] text-[var(--warning)]";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[12px] font-medium ${tone}`}
    >
      {badge.short}
    </span>
  );
}

function ClickUpLink({ url }: { url: string | null }) {
  const inner = (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-1.5 py-0.5 text-[13px] font-medium text-[var(--text-secondary)]"
      title="Synced with ClickUp"
    >
      ClickUp
      {url && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <path d="M15 3h6v6" />
          <path d="M10 14L21 3" />
        </svg>
      )}
    </span>
  );
  if (!url) return inner;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      {inner}
    </a>
  );
}

function RowActionsMenu({
  onEdit,
  onArchive,
}: {
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const mounted = useMounted();

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
                className="block w-full px-3 py-2 text-left text-[15px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onArchive();
                }}
                className="block w-full px-3 py-2 text-left text-[15px] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              >
                Archive
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
