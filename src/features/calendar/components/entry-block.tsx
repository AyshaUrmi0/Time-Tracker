"use client";

import type { CSSProperties } from "react";
import type { CalendarEntry } from "../types";
import { colorForTask, formatDurationSec } from "./format";

type Props = {
  entry: CalendarEntry;
  showUser: boolean;
  onClick: () => void;
  style: CSSProperties;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function EntryBlock({ entry, showUser, onClick, style }: Props) {
  const running = entry.endTime == null;
  const color = colorForTask(entry.taskId);
  const border = running ? "var(--accent)" : color.border;
  const bg = running ? "var(--accent-soft)" : color.bg;
  const text = running ? "var(--accent-hover)" : color.text;

  const tooltip = [
    entry.taskTitle,
    entry.user?.name ? `· ${entry.user.name}` : null,
    entry.durationSeconds != null
      ? `· ${formatDurationSec(entry.durationSeconds)}`
      : running
        ? "· running"
        : null,
    entry.note ? `— ${entry.note}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        ...style,
        borderLeftColor: border,
        backgroundColor: bg,
      }}
      className="group absolute flex flex-col overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left ring-1 ring-black/[0.02] transition-all duration-150 hover:z-20 hover:ring-black/[0.08] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
    >
      <div className="flex items-start gap-1">
        <span
          className="min-w-0 flex-1 truncate text-[11.5px] font-semibold leading-tight tracking-tight"
          style={{ color: text }}
        >
          {entry.taskTitle}
        </span>
        {running && (
          <span className="relative mt-[3px] flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-1 pt-0.5">
        {showUser && entry.user && (
          <span
            className="flex h-3.5 shrink-0 items-center justify-center rounded-sm px-1 text-[9px] font-semibold leading-none"
            style={{
              color: text,
              backgroundColor: running
                ? "rgba(99, 102, 241, 0.18)"
                : "rgba(0, 0, 0, 0.07)",
            }}
          >
            {initials(entry.user.name)}
          </span>
        )}
        <span
          className="tabular truncate text-[10px] leading-tight"
          style={{ color: text, opacity: 0.85 }}
        >
          {entry.durationSeconds != null
            ? formatDurationSec(entry.durationSeconds)
            : "running"}
        </span>
      </div>
    </button>
  );
}
