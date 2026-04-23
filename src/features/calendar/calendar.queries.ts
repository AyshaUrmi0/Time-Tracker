"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { calendarService, type CalendarWeekParams } from "./calendar.service";

export function useCalendarWeek(params: CalendarWeekParams) {
  return useQuery({
    queryKey: ["calendar", "week", params.start, params.userId ?? "self"],
    queryFn: () => calendarService.week(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
