"use client";

import { Button } from "@/components/ui/button";
import { weekRangeLabel } from "./format";

type Props = {
  weekStart: string;
  weekEnd: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreate?: () => void;
  isCurrent: boolean;
  isLoading?: boolean;
};

export function WeekToolbar({
  weekStart,
  weekEnd,
  onPrev,
  onNext,
  onToday,
  onCreate,
  isCurrent,
  isLoading,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:bg-[var(--surface-hover)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div
          className="flex min-w-[180px] items-center justify-center gap-2 border-x border-[var(--border)] px-3 text-[13px] font-semibold text-[var(--text-primary)]"
          aria-live="polite"
        >
          {isLoading && (
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-transparent"
            />
          )}
          <span className="tabular">{weekRangeLabel(weekStart, weekEnd)}</span>
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:bg-[var(--surface-hover)]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        onClick={onToday}
        disabled={isCurrent}
        className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-[var(--surface)] disabled:hover:text-[var(--text-secondary)]"
      >
        Today
      </button>

      {onCreate && (
        <Button size="sm" className="h-9" onClick={onCreate}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log time
        </Button>
      )}
    </div>
  );
}
