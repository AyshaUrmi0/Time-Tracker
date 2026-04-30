"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { useModal } from "@/contexts/ModalContext";
import { EntryFormDialog } from "@/features/time-entries/components/entry-form-dialog";
import {
  useCurrentTimer,
  useStartTimer,
  useStopTimer,
} from "../timer.queries";
import { useLiveDuration, formatHMS } from "../hooks/use-live-duration";
import { TaskPickerDialog } from "./task-picker-dialog";
import type { RunningTimer } from "../types";

const OVERTIME_THRESHOLD_SECONDS = 8 * 60 * 60;

export function TimerWidget() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { data, isLoading } = useCurrentTimer();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const startMutation = useStartTimer();
  const stopMutation = useStopTimer();

  if (status !== "authenticated" || !session?.user) return null;

  if (isLoading) {
    return <Skeleton className="h-9 w-[160px]" />;
  }

  const timer = data?.timer ?? null;
  const others = data?.others ?? [];

  return (
    <>
      <div className="inline-flex items-center gap-2">
        {timer ? (
          <RunningPill
            timerId={timer.id}
            taskTitle={timer.task.title}
            startTime={timer.startTime}
            onStop={() => stopMutation.mutate(undefined)}
            loading={stopMutation.isPending}
          />
        ) : (
          <StartButton
            isAdmin={isAdmin}
            disabled={startMutation.isPending}
            onStartTimer={() => setPickerOpen(true)}
            onManual={() => setManualOpen(true)}
          />
        )}

        {isAdmin && others.length > 0 && (
          <TeamRunningTimers
            timers={others}
            onStop={(entryId) => stopMutation.mutate(entryId)}
            stopping={stopMutation.isPending}
          />
        )}
      </div>

      <TaskPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(taskId) => {
          setPickerOpen(false);
          startMutation.mutate({ taskId });
        }}
        currentTaskId={timer?.taskId}
      />

      <EntryFormDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        mode="create"
      />
    </>
  );
}

function TeamRunningTimers({
  timers,
  onStop,
  stopping,
}: {
  timers: RunningTimer[];
  onStop: (entryId: string) => void;
  stopping: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[14px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)]" />
        <span className="tabular text-[var(--text-primary)]">{timers.length}</span>
        running
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
        >
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Team timers ({timers.length})
            </p>
          </div>
          <ul className="max-h-[60vh] divide-y divide-[var(--border)] overflow-auto">
            {timers.map((t) => (
              <TeamTimerRow
                key={t.id}
                timer={t}
                onStop={() => onStop(t.id)}
                stopping={stopping}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TeamTimerRow({
  timer,
  onStop,
  stopping,
}: {
  timer: RunningTimer;
  onStop: () => void;
  stopping: boolean;
}) {
  const seconds = useLiveDuration(timer.startTime);

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Avatar name={timer.user.name} id={timer.user.id} size={28} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-[var(--text-primary)]">
          {timer.user.name}
        </p>
        {timer.user.email && (
          <p
            className="truncate text-[12px] text-[var(--text-muted)]"
            title={timer.user.email}
          >
            {timer.user.email}
          </p>
        )}
        <p
          className="truncate text-[13px] text-[var(--text-muted)]"
          title={timer.task.title}
        >
          {timer.task.title}
        </p>
      </div>
      <span
        className="tabular shrink-0 text-[13px] font-semibold text-[var(--text-primary)]"
        aria-label="Elapsed time"
      >
        {formatHMS(seconds)}
      </span>
      <button
        type="button"
        onClick={onStop}
        disabled={stopping}
        title="Stop this timer"
        aria-label={`Stop ${timer.user.name}'s timer`}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-[var(--danger-soft)] px-2 text-[12px] font-semibold text-[var(--danger)] transition-colors duration-150 hover:bg-[var(--danger)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        Stop
      </button>
    </li>
  );
}

function StartButton({
  isAdmin,
  disabled,
  onStartTimer,
  onManual,
}: {
  isAdmin: boolean;
  disabled: boolean;
  onStartTimer: () => void;
  onManual: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isAdmin) {
    return (
      <button
        type="button"
        onClick={onStartTimer}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[15px] font-semibold text-white shadow-[var(--shadow-sm)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PlayIcon />
        Start timer
      </button>
    );
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={onStartTimer}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-2 rounded-l-lg bg-[var(--accent)] px-4 text-[15px] font-semibold text-white shadow-[var(--shadow-sm)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PlayIcon />
        Start timer
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="More entry options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-8 items-center justify-center rounded-r-lg border-l border-white/20 bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] transition-colors duration-150 hover:bg-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onStartTimer();
            }}
            className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-[var(--surface-hover)]"
          >
            <span className="mt-0.5 text-[var(--accent)]">
              <PlayIcon />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-[var(--text-primary)]">
                Timer mode
              </span>
              <span className="block text-[13px] text-[var(--text-muted)]">
                Track work as it happens
              </span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onManual();
            }}
            className="flex w-full items-start gap-3 border-t border-[var(--border)] px-3 py-2.5 text-left hover:bg-[var(--surface-hover)]"
          >
            <span className="mt-0.5 text-[var(--text-secondary)]">
              <ManualIcon />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-[var(--text-primary)]">
                Manual entry
              </span>
              <span className="block text-[13px] text-[var(--text-muted)]">
                Log time after the fact
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <polygon points="5 3 19 12 5 21" />
    </svg>
  );
}

function ManualIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function RunningPill({
  timerId,
  taskTitle,
  startTime,
  onStop,
  loading,
}: {
  timerId: string;
  taskTitle: string;
  startTime: string;
  onStop: () => void;
  loading: boolean;
}) {
  const seconds = useLiveDuration(startTime);
  const modal = useModal();
  const promptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (seconds < OVERTIME_THRESHOLD_SECONDS) return;
    if (promptedRef.current === timerId) return;
    promptedRef.current = timerId;
    modal
      .confirm({
        title: "Timer running for over 8 hours",
        description: `Your timer for "${taskTitle}" has been running for ${formatHMS(seconds)}. Would you like to stop it now?`,
        confirmLabel: "Stop timer",
        cancelLabel: "Keep running",
        destructive: true,
      })
      .then((ok) => {
        if (ok) onStop();
      });
  }, [seconds, timerId, taskTitle, modal, onStop]);

  return (
    <div
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-1 shadow-[var(--shadow-sm)]"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)]"
      />
      <span
        className="max-w-[140px] truncate text-[15px] font-medium text-[var(--text-secondary)]"
        title={taskTitle}
      >
        {taskTitle}
      </span>
      <span
        className="tabular text-[15px] font-semibold text-[var(--text-primary)]"
        aria-label="Elapsed time"
      >
        {formatHMS(seconds)}
      </span>
      <button
        type="button"
        onClick={onStop}
        disabled={loading}
        title="Stop timer"
        aria-label="Stop timer"
        className="group inline-flex h-7 items-center gap-1.5 rounded-md bg-[var(--danger-soft)] px-2.5 text-[13px] font-semibold text-[var(--danger)] transition-colors duration-150 hover:bg-[var(--danger)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        Stop
      </button>
    </div>
  );
}
