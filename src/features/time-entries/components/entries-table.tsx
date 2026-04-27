"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/avatar";
import { useMounted } from "@/lib/use-mounted";
import type { TimeEntry } from "../types";

type Props = {
  entries: TimeEntry[];
  currentUserId: string;
  isAdmin: boolean;
  showUser?: boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
};

function canMutate(entry: TimeEntry, currentUserId: string, isAdmin: boolean) {
  return isAdmin || entry.userId === currentUserId;
}

function formatDay(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return { key, label: "Today" };
  if (sameDay(d, yesterday)) return { key, label: "Yesterday" };
  return {
    key,
    label: d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
    }),
  };
}

function formatTimeRange(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const fmt = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endIso) return `${fmt(start)} – running`;
  const end = new Date(endIso);
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDurationSec(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${m}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

export function EntriesTable({
  entries,
  currentUserId,
  isAdmin,
  showUser = false,
  onEdit,
  onDelete,
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; items: TimeEntry[]; total: number }
    >();
    for (const entry of entries) {
      const { key, label } = formatDay(entry.startTime);
      const existing = map.get(key);
      const duration = entry.durationSeconds ?? 0;
      if (existing) {
        existing.items.push(entry);
        existing.total += duration;
      } else {
        map.set(key, { label, items: [entry], total: duration });
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [entries]);

  return (
    <div>
      {groups.map((group, idx) => (
        <section
          key={group.key}
          className={idx > 0 ? "border-t border-[var(--border)]" : undefined}
        >
          <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-hover)] px-4 py-2">
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {group.label}
            </h2>
            <span className="tabular text-[14px] font-semibold text-[var(--text-secondary)]">
              {formatDurationSec(group.total)}
            </span>
          </header>
          <ul className="divide-y divide-[var(--border)]">
            {group.items.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                canMutate={canMutate(entry, currentUserId, isAdmin)}
                showUser={showUser}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryRow({
  entry,
  canMutate,
  showUser,
  onEdit,
  onDelete,
}: {
  entry: TimeEntry;
  canMutate: boolean;
  showUser: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isRunning = entry.endTime === null;
  return (
    <li className="flex items-center gap-4 px-4 py-3 text-[15px] transition-colors duration-150 hover:bg-[var(--surface-hover)]">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={canMutate ? onEdit : undefined}
          disabled={!canMutate}
          className="block w-full text-left font-medium text-[var(--text-primary)] hover:text-[var(--accent-hover)] disabled:cursor-default disabled:hover:text-[var(--text-primary)]"
        >
          <span className="truncate">{entry.task.title}</span>
        </button>
        {entry.note && (
          <p className="mt-0.5 truncate text-[14px] text-[var(--text-muted)]">
            {entry.note}
          </p>
        )}
        <div className="mt-1 inline-flex flex-wrap items-center gap-2">
          {showUser && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
              <Avatar name={entry.user.name} id={entry.user.id} size={16} />
              {entry.user.name}
            </span>
          )}
          <SyncStatusBadge entry={entry} />
        </div>
      </div>

      <div className="hidden text-[14px] text-[var(--text-secondary)] sm:block">
        {formatTimeRange(entry.startTime, entry.endTime)}
      </div>

      <div className="tabular w-14 text-right text-[15px] font-semibold text-[var(--text-primary)]">
        {isRunning ? (
          <span className="inline-flex items-center gap-1 text-[var(--danger)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)]" />
            live
          </span>
        ) : (
          formatDurationSec(entry.durationSeconds)
        )}
      </div>

      <div className="w-8 text-right">
        {canMutate && !isRunning && (
          <RowActionsMenu onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </li>
  );
}

function SyncStatusBadge({ entry }: { entry: TimeEntry }) {
  if (!entry.task.clickupTaskId) return null;
  if (entry.syncStatus === "SYNCED") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[13px] text-[var(--success)]"
        title="Synced to ClickUp"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
        Synced
      </span>
    );
  }
  if (entry.syncStatus === "FAILED") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[13px] text-[var(--danger)]"
        title={entry.syncLastError ?? "Sync to ClickUp failed"}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
        Sync failed
      </span>
    );
  }
  if (entry.endTime) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[13px] text-[var(--text-muted)]"
        title="Not yet pushed to ClickUp"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
        Pending sync
      </span>
    );
  }
  return null;
}

const MENU_WIDTH = 160;
const MENU_HEIGHT = 80;
const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;

function RowActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
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
      left = Math.max(
        VIEWPORT_PADDING,
        Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
      );
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
        aria-label="Entry actions"
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
                  onDelete();
                }}
                className="block w-full px-3 py-2 text-left text-[15px] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              >
                Delete
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
