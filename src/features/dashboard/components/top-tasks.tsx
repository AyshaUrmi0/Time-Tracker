import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardTopTask } from "../types";
import { formatDurationSec } from "./format";

type Props = { tasks: DashboardTopTask[] };

export function TopTasks({ tasks }: Props) {
  const max = Math.max(1, ...tasks.map((t) => t.seconds));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
          Top tasks this week
        </h2>
        <p className="text-[11px] text-[var(--text-muted)]">
          By total time tracked
        </p>
      </header>

      {tasks.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No tasks tracked yet"
            description="Start a timer or log time to see your top tasks this week."
          />
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {tasks.map((task) => {
            const pct = Math.round((task.seconds / max) * 100);
            return (
              <li key={task.taskId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
                    {task.title}
                  </span>
                  <span className="tabular text-[12px] font-semibold text-[var(--text-secondary)]">
                    {formatDurationSec(task.seconds)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
