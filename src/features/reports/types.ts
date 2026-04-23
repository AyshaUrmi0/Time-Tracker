import type { TaskStatus } from "@/features/tasks/types";

export type ReportScope = "user" | "team";
export type ReportGroupBy = "day" | "task" | "user";

export type ReportBucket = {
  key: string;
  label: string;
  seconds: number;
  entries: number;
  date?: string;
  task?: { id: string; title: string; status: TaskStatus };
  user?: { id: string; name: string };
};

export type ReportSummary = {
  scope: ReportScope;
  groupBy: ReportGroupBy;
  from: string;
  to: string;
  timezone: string;
  total: { seconds: number; entries: number };
  buckets: ReportBucket[];
};
