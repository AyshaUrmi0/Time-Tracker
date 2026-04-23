import { apiFetch } from "@/lib/api-client";
import type { CalendarWeek } from "./types";

export type CalendarWeekParams = {
  start: string;
  userId?: string;
};

export const calendarService = {
  week({ start, userId }: CalendarWeekParams) {
    const params = new URLSearchParams({ start });
    if (userId) params.set("userId", userId);
    return apiFetch<{ week: CalendarWeek }>(
      `/api/calendar/week?${params.toString()}`,
    ).then((r) => r.week);
  },
};
