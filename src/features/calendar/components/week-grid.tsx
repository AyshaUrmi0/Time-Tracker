"use client";

import { useMemo } from "react";
import { DayBody } from "./day-body";
import { DayHeader } from "./day-header";
import { HourAxis } from "./hour-axis";
import { localMinutesInTz, localYmdInTz } from "./format";
import type { CalendarDay, CalendarEntry, CalendarWeek } from "../types";

const HOUR_HEIGHT = 60;
const AXIS_WIDTH = 64;
const DEFAULT_START_HOUR = 10;
const DEFAULT_END_HOUR = 22;

type Props = {
  week: CalendarWeek;
  todayYmd: string;
  showUser: boolean;
  canCreate: boolean;
  isStale?: boolean;
  onEntryClick: (entry: CalendarEntry) => void;
  onSlotClick: (dayYmd: string, hour: number) => void;
};

function computeHourRange(week: CalendarWeek, now: Date): {
  startHour: number;
  endHour: number;
} {
  let minMin = DEFAULT_START_HOUR * 60;
  let maxMin = DEFAULT_END_HOUR * 60;

  for (const day of week.days) {
    for (const e of day.entries) {
      const s = localMinutesInTz(e.startTime, week.timezone);
      if (s < minMin) minMin = s;
      const endIso = e.endTime ?? now.toISOString();
      const endYmd = localYmdInTz(endIso, week.timezone);
      const endMin =
        endYmd > day.date ? 24 * 60 : localMinutesInTz(endIso, week.timezone);
      if (endMin > maxMin) maxMin = endMin;
    }
  }

  const startHour = Math.max(0, Math.floor(minMin / 60));
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(maxMin / 60)));
  return { startHour, endHour };
}

export function WeekGrid({
  week,
  todayYmd,
  showUser,
  canCreate,
  isStale,
  onEntryClick,
  onSlotClick,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const { startHour, endHour } = useMemo(
    () => computeHourRange(week, now),
    [week, now],
  );

  const gridTemplate = `${AXIS_WIDTH}px repeat(7, minmax(0, 1fr))`;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-opacity duration-150 ${
        isStale ? "opacity-70" : "opacity-100"
      }`}
    >
      <div
        className="sticky top-0 z-20 grid border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="flex items-center justify-center border-r border-[var(--border)] py-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          {week.timezone.split("/").pop()?.replace("_", " ") ?? "Time"}
        </div>
        {week.days.map((day: CalendarDay, i: number) => (
          <DayHeader
            key={day.date}
            day={day}
            isToday={day.date === todayYmd}
            isLast={i === week.days.length - 1}
          />
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
        <HourAxis
          startHour={startHour}
          endHour={endHour}
          hourHeight={HOUR_HEIGHT}
        />
        {week.days.map((day: CalendarDay, i: number) => (
          <DayBody
            key={day.date}
            day={day}
            timezone={week.timezone}
            gridStartHour={startHour}
            gridEndHour={endHour}
            hourHeight={HOUR_HEIGHT}
            isToday={day.date === todayYmd}
            isLast={i === week.days.length - 1}
            showUser={showUser}
            canCreate={canCreate}
            now={now}
            onEntryClick={onEntryClick}
            onSlotClick={onSlotClick}
          />
        ))}
      </div>
    </div>
  );
}
