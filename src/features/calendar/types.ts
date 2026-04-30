import type { TaskStatus } from "@/features/tasks/types";

export type CalendarScope = "user" | "team";

export type CalendarUser = { id: string; name: string };

export type CalendarEntry = {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  taskStatus: TaskStatus;
  note: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  isManual: boolean;
  user?: CalendarUser;
};

export type CalendarDay = {
  date: string;
  weekday: string;
  entries: CalendarEntry[];
  totalSeconds: number;
};

export type CalendarWeek = {
  scope: CalendarScope;
  weekStart: string;
  weekEnd: string;
  timezone: string;
  days: CalendarDay[];
  totalSeconds: number;
};
