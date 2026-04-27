"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import type { DashboardRunningTimer } from "../types";
import { formatDurationHM } from "./format";

type Props = {
  timers: DashboardRunningTimer[];
  showUser: boolean;
};

function secondsSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
}

export function RunningTimers({ timers, showUser }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timers.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timers.length]);

  if (timers.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] shadow-[var(--shadow-sm)]">
      <header className="flex items-center justify-between border-b border-[var(--accent)]/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
          </span>
          <h2 className="text-[13px] font-semibold text-[var(--accent-hover)]">
            {showUser
              ? `${timers.length} active ${timers.length === 1 ? "timer" : "timers"}`
              : "Tracking now"}
          </h2>
        </div>
      </header>
      <ul className="divide-y divide-[var(--accent)]/15">
        {timers.map((timer) => (
          <li
            key={timer.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            {showUser && timer.user && (
              <Avatar
                name={timer.user.name}
                id={timer.user.id}
                size={28}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                {timer.task.title}
              </p>
              {showUser && timer.user && (
                <p className="text-[11px] text-[var(--text-muted)]">
                  {timer.user.name}
                </p>
              )}
            </div>
            <span className="tabular text-[14px] font-semibold text-[var(--accent-hover)]">
              {formatDurationHM(secondsSince(timer.startTime, now))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
