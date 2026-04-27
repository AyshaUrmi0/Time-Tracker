"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCurrentTimer,
  useStartTimer,
  useStopTimer,
} from "../timer.queries";
import { useLiveDuration, formatHMS } from "../hooks/use-live-duration";
import { TaskPickerDialog } from "./task-picker-dialog";

export function TimerWidget() {
  const { data: session, status } = useSession();
  const { data, isLoading } = useCurrentTimer();
  const [pickerOpen, setPickerOpen] = useState(false);
  const startMutation = useStartTimer();
  const stopMutation = useStopTimer();

  if (status !== "authenticated" || !session?.user) return null;

  if (isLoading) {
    return <Skeleton className="h-8 w-[140px]" />;
  }

  const timer = data?.timer;

  return (
    <>
      {timer ? (
        <RunningPill
          taskTitle={timer.task.title}
          startTime={timer.startTime}
          onStop={() => stopMutation.mutate()}
          loading={stopMutation.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={startMutation.isPending}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <polygon points="5 3 19 12 5 21" />
          </svg>
          Start timer
        </button>
      )}

      <TaskPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(taskId) => {
          setPickerOpen(false);
          startMutation.mutate({ taskId });
        }}
        currentTaskId={timer?.taskId}
      />
    </>
  );
}

function RunningPill({
  taskTitle,
  startTime,
  onStop,
  loading,
}: {
  taskTitle: string;
  startTime: string;
  onStop: () => void;
  loading: boolean;
}) {
  const seconds = useLiveDuration(startTime);

  return (
    <div
      className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-2 pr-0.5 shadow-[var(--shadow-sm)]"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--danger)]"
      />
      <span
        className="max-w-[140px] truncate text-[12px] font-medium text-[var(--text-secondary)]"
        title={taskTitle}
      >
        {taskTitle}
      </span>
      <span
        className="tabular text-[12px] font-semibold text-[var(--text-primary)]"
        aria-label="Elapsed time"
      >
        {formatHMS(seconds)}
      </span>
      <button
        type="button"
        onClick={onStop}
        disabled={loading}
        aria-label="Stop timer"
        className="grid h-7 w-7 place-items-center rounded-md text-[var(--danger)] transition-colors duration-150 hover:bg-[var(--danger-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)] disabled:opacity-50"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      </button>
    </div>
  );
}
