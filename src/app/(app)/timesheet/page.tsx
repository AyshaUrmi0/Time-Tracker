"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useModal } from "@/contexts/ModalContext";
import {
  useTimeEntries,
  useDeleteTimeEntry,
} from "@/features/time-entries/time-entries.queries";
import { useSelectableUsers } from "@/features/users/users.queries";
import { EntriesTable } from "@/features/time-entries/components/entries-table";
import { EntryFormDialog } from "@/features/time-entries/components/entry-form-dialog";
import type { TimeEntry } from "@/features/time-entries/types";

type Range = "today" | "week" | "month";

function computeRange(range: Range): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === "week") start.setDate(start.getDate() - 6);
  if (range === "month") start.setDate(start.getDate() - 29);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatDurationSec(sec: number): string {
  if (sec <= 0) return "0m";
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${m}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

export default function TimesheetPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const isAdmin = session?.user?.role === "ADMIN";

  const [range, setRange] = useState<Range>("week");
  const [userFilter, setUserFilter] = useState<string>("me");

  const rangeWindow = useMemo(() => computeRange(range), [range]);

  const entriesQuery = useTimeEntries({
    from: rangeWindow.from,
    to: rangeWindow.to,
    userId:
      isAdmin && userFilter !== "me" && userFilter !== "all"
        ? userFilter
        : isAdmin && userFilter === "all"
          ? undefined
          : currentUserId,
  });

  const usersQuery = useSelectableUsers();
  const deleteMutation = useDeleteTimeEntry();
  const modal = useModal();

  const [formState, setFormState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | { open: true; mode: "edit"; entry: TimeEntry }
  >({ open: false });

  const entries = useMemo(
    () => entriesQuery.data ?? [],
    [entriesQuery.data],
  );
  const totalSec = useMemo(
    () => entries.reduce((sum, e) => sum + (e.durationSeconds ?? 0), 0),
    [entries],
  );

  async function handleDelete(entry: TimeEntry) {
    const ok = await modal.confirm({
      title: "Delete this entry?",
      description: (
        <>
          <strong>{entry.task.title}</strong> · this deletes the entry
          permanently. You can log the time again if needed.
        </>
      ),
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(entry.id);
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            Timesheet
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Review, edit, and log time entries manually.
          </p>
        </div>
        <Button onClick={() => setFormState({ open: true, mode: "create" })}>
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          Log time
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-1">
          <RangeTab value="today" current={range} onChange={setRange}>
            Today
          </RangeTab>
          <RangeTab value="week" current={range} onChange={setRange}>
            Last 7 days
          </RangeTab>
          <RangeTab value="month" current={range} onChange={setRange}>
            Last 30 days
          </RangeTab>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-8 appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="me">My entries</option>
              <option value="all">All team</option>
              {usersQuery.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
          <div className="text-[12px] text-[var(--text-muted)]">
            Total{" "}
            <span className="tabular ml-1 text-[13px] font-semibold text-[var(--text-primary)]">
              {formatDurationSec(totalSec)}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        {entriesQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No entries in this range"
            description="Log time manually to fill in work you tracked elsewhere, or start the timer."
            action={
              <Button
                size="sm"
                onClick={() => setFormState({ open: true, mode: "create" })}
              >
                Log time
              </Button>
            }
          />
        ) : (
          <EntriesTable
            entries={entries}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            showUser={isAdmin && userFilter !== "me"}
            onEdit={(entry) => setFormState({ open: true, mode: "edit", entry })}
            onDelete={handleDelete}
          />
        )}
      </div>

      <EntryFormDialog
        open={formState.open}
        onClose={() => setFormState({ open: false })}
        mode={formState.open ? formState.mode : "create"}
        entry={
          formState.open && formState.mode === "edit" ? formState.entry : undefined
        }
        canEdit={
          formState.open && formState.mode === "edit"
            ? isAdmin || formState.entry.userId === currentUserId
            : true
        }
      />
    </div>
  );
}

function RangeTab({
  value,
  current,
  onChange,
  children,
}: {
  value: Range;
  current: Range;
  onChange: (v: Range) => void;
  children: React.ReactNode;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={
        "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors duration-150 " +
        (active
          ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")
      }
    >
      {children}
    </button>
  );
}
