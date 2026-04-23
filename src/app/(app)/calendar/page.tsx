"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCalendarWeek } from "@/features/calendar/calendar.queries";
import { useSelectableUsers } from "@/features/users/users.queries";
import { WeekGrid } from "@/features/calendar/components/week-grid";
import { WeekToolbar } from "@/features/calendar/components/week-toolbar";
import { ScopeFilter } from "@/features/calendar/components/scope-filter";
import {
  todayInTimezone,
  addDaysYmd,
  formatDurationSec,
  weekRangeLabel,
} from "@/features/calendar/components/format";
import { useDocumentTitle } from "@/lib/use-document-title";
import { EntryFormDialog } from "@/features/time-entries/components/entry-form-dialog";
import type { CalendarEntry } from "@/features/calendar/types";
import type { TimeEntry } from "@/features/time-entries/types";

function toTimeEntryForDialog(
  entry: CalendarEntry,
  viewerEmail: string,
): TimeEntry {
  return {
    id: entry.id,
    userId: entry.userId,
    taskId: entry.taskId,
    note: entry.note,
    startTime: entry.startTime,
    endTime: entry.endTime,
    durationSeconds: entry.durationSeconds,
    isManual: entry.isManual,
    source: "LOCAL",
    createdAt: entry.startTime,
    updatedAt: entry.endTime ?? entry.startTime,
    user: {
      id: entry.user?.id ?? entry.userId,
      name: entry.user?.name ?? "",
      email: entry.user ? "" : viewerEmail,
    },
    task: {
      id: entry.taskId,
      title: entry.taskTitle,
      status: entry.taskStatus,
      isArchived: false,
    },
  };
}

function hourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export default function CalendarPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const viewerEmail = session?.user?.email ?? "";
  const tz =
    session?.user?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [adminView, setAdminView] = useState<string>("team");
  const [weekStart, setWeekStart] = useState<string>(() => todayInTimezone(tz));

  const usersQuery = useSelectableUsers();

  const userIdForQuery = useMemo(() => {
    if (!isAdmin) return undefined;
    if (adminView === "team") return undefined;
    return adminView;
  }, [isAdmin, adminView]);

  const weekQuery = useCalendarWeek({
    start: weekStart,
    userId: userIdForQuery,
  });
  const week = weekQuery.data;
  const isStale = weekQuery.isPlaceholderData || weekQuery.isFetching;

  const viewingLabel = useMemo(() => {
    if (!isAdmin || adminView === "team") return null;
    const u = usersQuery.data?.find((x) => x.id === adminView);
    return u?.name ?? null;
  }, [isAdmin, adminView, usersQuery.data]);

  const isTeamView = week?.scope === "team";
  const currentUserId = session?.user?.id ?? "";
  const canCreateFromSlot = !isAdmin || adminView === currentUserId;

  const todayYmd = useMemo(
    () => (week ? todayInTimezone(week.timezone) : todayInTimezone(tz)),
    [week, tz],
  );
  const isCurrentWeek = useMemo(() => {
    if (!week) return false;
    return todayYmd >= week.weekStart && todayYmd <= week.weekEnd;
  }, [week, todayYmd]);

  const entryCount = useMemo(() => {
    if (!week) return 0;
    return week.days.reduce((sum, d) => sum + d.entries.length, 0);
  }, [week]);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [activeEntry, setActiveEntry] = useState<CalendarEntry | null>(null);
  const [prefill, setPrefill] = useState<
    { date: string; startTime: string; endTime: string } | undefined
  >(undefined);

  function handleEntryClick(entry: CalendarEntry) {
    setActiveEntry(entry);
    setModalMode("edit");
  }

  function handleSlotClick(dayYmd: string, hour: number) {
    const nextHour = Math.min(23, hour + 1);
    setPrefill({
      date: dayYmd,
      startTime: hourLabel(hour),
      endTime: hourLabel(nextHour === hour ? hour : nextHour),
    });
    setActiveEntry(null);
    setModalMode("create");
  }

  function handleCreateClick() {
    if (!week) return;
    const date =
      todayYmd >= week.weekStart && todayYmd <= week.weekEnd
        ? todayYmd
        : week.weekStart;
    const now = new Date();
    const end = new Date(now);
    end.setSeconds(0, 0);
    const start = new Date(end.getTime() - 30 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    setPrefill({
      date,
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    });
    setActiveEntry(null);
    setModalMode("create");
  }

  function closeModal() {
    setModalMode(null);
    setActiveEntry(null);
    setPrefill(undefined);
  }

  function goPrev() {
    if (!week) return;
    setWeekStart(addDaysYmd(week.weekStart, -7));
  }
  function goNext() {
    if (!week) return;
    setWeekStart(addDaysYmd(week.weekStart, 7));
  }
  function goToday() {
    setWeekStart(todayInTimezone(tz));
  }

  const canEditActive = activeEntry
    ? isAdmin || activeEntry.userId === currentUserId
    : false;

  useDocumentTitle(
    week
      ? `${weekRangeLabel(week.weekStart, week.weekEnd)} | Calendar | Time Tracker`
      : null,
  );

  const pageTitle = isTeamView
    ? "Team calendar"
    : viewingLabel
      ? `${viewingLabel}'s calendar`
      : "Calendar";

  const metaLine = week ? (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-secondary)]">
      <span className="tabular font-medium text-[var(--text-primary)]">
        {formatDurationSec(week.totalSeconds)}
      </span>
      <span className="text-[var(--text-muted)]">tracked</span>
      <span className="h-1 w-1 rounded-full bg-[var(--text-muted)] opacity-50" />
      <span>
        <span className="tabular font-medium text-[var(--text-primary)]">
          {entryCount}
        </span>{" "}
        {entryCount === 1 ? "entry" : "entries"}
      </span>
      {isTeamView && (
        <>
          <span className="h-1 w-1 rounded-full bg-[var(--text-muted)] opacity-50" />
          <span>team view</span>
        </>
      )}
    </span>
  ) : null;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            {pageTitle}
          </h1>
          <div className="mt-1">
            {metaLine ?? (
              <span className="text-[13px] text-[var(--text-secondary)]">
                Your week at a glance.
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <ScopeFilter
            value={adminView}
            onChange={setAdminView}
            users={usersQuery.data}
          />
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {week ? (
          <WeekToolbar
            weekStart={week.weekStart}
            weekEnd={week.weekEnd}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
            onCreate={canCreateFromSlot ? handleCreateClick : undefined}
            isCurrent={isCurrentWeek}
            isLoading={isStale}
          />
        ) : (
          <Skeleton className="h-9 w-[360px]" />
        )}
      </div>

      {!week ? (
        <CalendarSkeleton />
      ) : (
        <div className="relative">
          <WeekGrid
            week={week}
            todayYmd={todayYmd}
            showUser={isTeamView}
            canCreate={canCreateFromSlot}
            isStale={isStale}
            onEntryClick={handleEntryClick}
            onSlotClick={handleSlotClick}
          />

          {week.totalSeconds === 0 && !isStale && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-24">
              <div className="pointer-events-auto max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 px-6 py-5 text-center shadow-[var(--shadow-md)] backdrop-blur">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-hover)]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                  Nothing tracked this week
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--text-secondary)]">
                  {canCreateFromSlot
                    ? "Click any hour slot in the grid, or log time below."
                    : "No entries in this scope for the selected week."}
                </p>
                {canCreateFromSlot && (
                  <div className="mt-4">
                    <Button size="sm" onClick={handleCreateClick}>
                      Log time
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <EntryFormDialog
        open={modalMode !== null}
        onClose={closeModal}
        mode={modalMode ?? "create"}
        entry={
          activeEntry
            ? toTimeEntryForDialog(activeEntry, viewerEmail)
            : undefined
        }
        canEdit={canEditActive}
        initial={modalMode === "create" ? prefill : undefined}
      />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-[640px] w-full" />
    </div>
  );
}
