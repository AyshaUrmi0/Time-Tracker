import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardRecentEntry } from "../types";
import { formatDurationSec, formatTime } from "./format";

type Props = {
  entries: DashboardRecentEntry[];
  showUser: boolean;
};

export function RecentEntries({ entries, showUser }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          Recent entries
        </h2>
        <p className="text-[11px] text-[var(--text-muted)]">
          {showUser ? "Team's latest time logs" : "Your latest time logs"}
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No entries yet"
            description="Log time manually or start the timer to see entries here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--surface-hover)]"
            >
              {showUser && entry.user && (
                <Avatar
                  name={entry.user.name}
                  id={entry.user.id}
                  size={28}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                  {entry.taskTitle}
                </p>
                {entry.note && (
                  <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                    {entry.note}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {showUser && entry.user ? `${entry.user.name} · ` : ""}
                  {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                </p>
              </div>
              <span className="tabular shrink-0 text-[12px] font-semibold text-[var(--text-secondary)]">
                {formatDurationSec(entry.durationSeconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
