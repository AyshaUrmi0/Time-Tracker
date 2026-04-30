import type { TaskStatus } from "@/features/tasks/types";

export type DashboardScope = "user" | "team";

export type DashboardUser = { id: string; name: string; email: string };

export type DashboardRunningTimer = {
  id: string;
  startTime: string;
  user?: DashboardUser;
  task: { id: string; title: string; status: TaskStatus };
};

export type DashboardRecentEntry = {
  id: string;
  taskId: string;
  taskTitle: string;
  note: string | null;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  user?: DashboardUser;
};

export type DashboardTopTask = {
  taskId: string;
  title: string;
  seconds: number;
};

export type DashboardActivityDay = {
  date: string;
  seconds: number;
};

export type DashboardSummary = {
  scope: DashboardScope;
  today: { seconds: number };
  week: { seconds: number };
  runningTimers: DashboardRunningTimer[];
  activity: DashboardActivityDay[];
  recentEntries: DashboardRecentEntry[];
  topTasks: DashboardTopTask[];
};
