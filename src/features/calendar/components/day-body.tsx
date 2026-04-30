"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CalendarDay, CalendarEntry } from "../types";
import { EntryBlock } from "./entry-block";
import { formatDurationSec, localMinutesInTz, localYmdInTz } from "./format";

const MIN_HEIGHT_PX = 22;
const BLOCK_GAP_PX = 2;
const MAX_VISIBLE_LANES = 3;
const OVERFLOW_LANE = MAX_VISIBLE_LANES - 1;

type Props = {
  day: CalendarDay;
  timezone: string;
  gridStartHour: number;
  gridEndHour: number;
  hourHeight: number;
  isToday: boolean;
  isLast: boolean;
  showUser: boolean;
  canCreate: boolean;
  now: Date;
  onEntryClick: (entry: CalendarEntry) => void;
  onSlotClick: (dayYmd: string, hour: number) => void;
};

type Grouped = {
  entry: CalendarEntry;
  startMin: number;
  endMin: number;
  lane: number;
};

type LaidOutEntry = {
  type: "entry";
  entry: CalendarEntry;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
};

type LaidOutOverflow = {
  type: "overflow";
  id: string;
  entries: CalendarEntry[];
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
};

type LaidOutItem = LaidOutEntry | LaidOutOverflow;

function layoutEntries(
  entries: CalendarEntry[],
  dayYmd: string,
  timezone: string,
  now: Date,
): LaidOutItem[] {
  const nowIso = now.toISOString();
  const items: Grouped[] = entries
    .map((entry) => {
      const startMin = localMinutesInTz(entry.startTime, timezone);
      const endIso = entry.endTime ?? nowIso;
      const endYmd = localYmdInTz(endIso, timezone);
      const endMin =
        endYmd > dayYmd ? 24 * 60 : localMinutesInTz(endIso, timezone);
      return {
        entry,
        startMin: Math.max(0, startMin),
        endMin: Math.max(startMin + 1, Math.min(24 * 60, endMin)),
        lane: 0,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  let group: Grouped[] = [];
  let laneEnds: number[] = [];
  let groupMaxEnd = 0;
  const result: LaidOutItem[] = [];

  const finalizeGroup = () => {
    if (group.length === 0) return;
    const width = laneEnds.length;
    if (width <= MAX_VISIBLE_LANES) {
      for (const g of group) {
        result.push({
          type: "entry",
          entry: g.entry,
          startMin: g.startMin,
          endMin: g.endMin,
          lane: g.lane,
          lanes: width,
        });
      }
    } else {
      const visible = group.filter((g) => g.lane < OVERFLOW_LANE);
      const hidden = group.filter((g) => g.lane >= OVERFLOW_LANE);
      for (const g of visible) {
        result.push({
          type: "entry",
          entry: g.entry,
          startMin: g.startMin,
          endMin: g.endMin,
          lane: g.lane,
          lanes: MAX_VISIBLE_LANES,
        });
      }
      const startMin = hidden.reduce(
        (m, h) => Math.min(m, h.startMin),
        hidden[0]!.startMin,
      );
      const endMin = hidden.reduce(
        (m, h) => Math.max(m, h.endMin),
        hidden[0]!.endMin,
      );
      result.push({
        type: "overflow",
        id: `overflow-${dayYmd}-${startMin}-${endMin}`,
        entries: hidden.map((h) => h.entry),
        startMin,
        endMin,
        lane: OVERFLOW_LANE,
        lanes: MAX_VISIBLE_LANES,
      });
    }
    group = [];
    laneEnds = [];
    groupMaxEnd = 0;
  };

  for (const it of items) {
    if (group.length > 0 && it.startMin >= groupMaxEnd) {
      finalizeGroup();
    }
    let lane = -1;
    for (let l = 0; l < laneEnds.length; l++) {
      if (laneEnds[l]! <= it.startMin) {
        lane = l;
        break;
      }
    }
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = it.endMin;
    it.lane = lane;
    group.push(it);
    if (it.endMin > groupMaxEnd) groupMaxEnd = it.endMin;
  }
  finalizeGroup();

  return result;
}

function formatTimeRangeLocal(
  startIso: string,
  endIso: string | null,
  timezone: string,
): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
  if (!endIso) return `${fmt(startIso)} – running`;
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

function OverflowStack({
  entries,
  showUser,
  timezone,
  style,
  onEntryClick,
}: {
  entries: CalendarEntry[];
  showUser: boolean;
  timezone: string;
  style: CSSProperties;
  onEntryClick: (entry: CalendarEntry) => void;
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
    <div ref={ref} className="absolute" style={style}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${entries.length} more entries — click to view`}
        className="flex h-full w-full flex-col items-stretch justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-hover)] px-1.5 py-1 text-left transition-all duration-150 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
      >
        <span className="truncate text-[11.5px] font-semibold leading-tight text-[var(--text-primary)]">
          +{entries.length} more
        </span>
        <span className="truncate text-[11px] leading-tight text-[var(--text-muted)]">
          tap to view
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-72 max-w-[80vw] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
        >
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Overlapping entries ({entries.length})
            </p>
          </div>
          <ul className="max-h-[60vh] divide-y divide-[var(--border)] overflow-auto">
            {entries.map((e) => {
              const running = e.endTime == null;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setOpen(false);
                      onEntryClick(e);
                    }}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <span className="truncate text-[13.5px] font-medium text-[var(--text-primary)]">
                      {e.taskTitle}
                    </span>
                    <span className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                      {showUser && e.user?.name && (
                        <span
                          className="truncate"
                          title={e.user.email}
                        >
                          {e.user.name}
                          {e.user.email && (
                            <span className="ml-1">· {e.user.email}</span>
                          )}
                        </span>
                      )}
                      <span className="tabular">
                        {formatTimeRangeLocal(e.startTime, e.endTime, timezone)}
                      </span>
                      <span className="tabular ml-auto shrink-0 font-medium text-[var(--text-secondary)]">
                        {running
                          ? "running"
                          : e.durationSeconds != null
                            ? formatDurationSec(e.durationSeconds)
                            : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DayBody({
  day,
  timezone,
  gridStartHour,
  gridEndHour,
  hourHeight,
  isToday,
  isLast,
  showUser,
  canCreate,
  now,
  onEntryClick,
  onSlotClick,
}: Props) {
  const totalHours = gridEndHour - gridStartHour;
  const gridStartMin = gridStartHour * 60;

  const laid = useMemo(
    () => layoutEntries(day.entries, day.date, timezone, now),
    [day.entries, day.date, timezone, now],
  );

  const nowTop = useMemo(() => {
    if (!isToday) return null;
    const nowMin = localMinutesInTz(now.toISOString(), timezone);
    if (nowMin < gridStartMin || nowMin > gridEndHour * 60) return null;
    return ((nowMin - gridStartMin) / 60) * hourHeight;
  }, [isToday, now, timezone, gridStartMin, gridEndHour, hourHeight]);

  return (
    <div
      className={`relative ${
        isToday ? "bg-[var(--accent-soft)]/25" : "bg-[var(--surface)]"
      } ${isLast ? "" : "border-r border-[var(--border)]"}`}
      style={{ height: totalHours * hourHeight }}
    >
      {Array.from({ length: totalHours }).map((_, i) => {
        const hour = gridStartHour + i;
        return (
          <button
            key={hour}
            type="button"
            disabled={!canCreate}
            onClick={() => canCreate && onSlotClick(day.date, hour)}
            className={`group block w-full border-b border-dashed border-[var(--border)] transition-colors duration-150 ${
              canCreate
                ? "cursor-pointer hover:bg-[var(--accent-soft)]"
                : ""
            } disabled:cursor-default`}
            style={{ height: hourHeight }}
            aria-label={canCreate ? `Log time at ${hour}:00 on ${day.date}` : undefined}
          >
            {canCreate && (
              <span className="invisible flex h-full items-center justify-center text-[12px] font-medium text-[var(--accent-hover)] group-hover:visible">
                + Log time
              </span>
            )}
          </button>
        );
      })}

      {laid.map((item) => {
        const top = ((item.startMin - gridStartMin) / 60) * hourHeight;
        const height = Math.max(
          MIN_HEIGHT_PX,
          ((item.endMin - item.startMin) / 60) * hourHeight - BLOCK_GAP_PX,
        );
        const laneWidthPct = 100 / item.lanes;
        const leftPct = item.lane * laneWidthPct;
        const style: CSSProperties = {
          top,
          height,
          left: `calc(${leftPct}% + 2px)`,
          width: `calc(${laneWidthPct}% - 4px)`,
        };
        if (item.type === "entry") {
          return (
            <EntryBlock
              key={item.entry.id}
              entry={item.entry}
              showUser={showUser}
              onClick={() => onEntryClick(item.entry)}
              style={style}
            />
          );
        }
        return (
          <OverflowStack
            key={item.id}
            entries={item.entries}
            showUser={showUser}
            timezone={timezone}
            style={style}
            onEntryClick={onEntryClick}
          />
        );
      })}

      {nowTop != null && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-10"
          style={{ top: nowTop }}
        >
          <div className="relative h-px bg-[var(--accent)]">
            <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-[var(--accent)] shadow-[0_0_0_3px_var(--accent-soft)]" />
          </div>
        </div>
      )}
    </div>
  );
}
