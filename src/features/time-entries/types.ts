import type { TaskStatus } from "@/features/tasks/types";

export type EntrySource = "LOCAL" | "CLICKUP" | "CLICKUP_INITIAL_SYNC";

export type SyncStatus = "NOT_SYNCED" | "SYNCED" | "FAILED";

export type TimeEntryUser = { id: string; name: string; email: string };

export type TimeEntryTask = {
  id: string;
  title: string;
  status: TaskStatus;
  isArchived: boolean;
  clickupTaskId: string | null;
};

export type TimeEntry = {
  id: string;
  userId: string;
  taskId: string;
  note: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  isManual: boolean;
  source: EntrySource;
  createdAt: string;
  updatedAt: string;
  user: TimeEntryUser;
  task: TimeEntryTask;
  syncStatus: SyncStatus;
  clickupTimeEntryId: string | null;
  syncLastError: string | null;
};

export type TimeEntryListFilters = {
  from?: string;
  to?: string;
  userId?: string;
  taskId?: string;
};
