"use client";

import { useMemo } from "react";
import type { CalendarDay, CalendarEntry } from "../types";
import { EntryBlock } from "./entry-block";
import { localMinutesInTz, localYmdInTz } from "./format";

const MIN_HEIGHT_PX = 22;
const BLOCK_GAP_PX = 2;

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

type LaidOutEntry = {
  entry: CalendarEntry;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
};

function layoutEntries(
  entries: CalendarEntry[],
  dayYmd: string,
  timezone: string,
  now: Date,
): LaidOutEntry[] {
  const nowIso = now.toISOString();
  const items = entries
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
        lanes: 1,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  let group: LaidOutEntry[] = [];
  let laneEnds: number[] = [];
  let groupMaxEnd = 0;

  const finalizeGroup = () => {
    const width = laneEnds.length;
    for (const g of group) g.lanes = width;
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
  if (group.length > 0) finalizeGroup();

  return items;
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
              <span className="invisible flex h-full items-center justify-center text-[10px] font-medium text-[var(--accent-hover)] group-hover:visible">
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
        return (
          <EntryBlock
            key={item.entry.id}
            entry={item.entry}
            showUser={showUser}
            onClick={() => onEntryClick(item.entry)}
            style={{
              top,
              height,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${laneWidthPct}% - 4px)`,
            }}
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
