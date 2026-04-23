import { apiFetch } from "@/lib/api-client";
import type { ReportGroupBy, ReportSummary } from "./types";

export type ReportSummaryParams = {
  from: string;
  to: string;
  groupBy: ReportGroupBy;
  userId?: string;
  taskId?: string;
  entryType?: "timer" | "manual";
};

export const reportsService = {
  summary(params: ReportSummaryParams) {
    const qs = new URLSearchParams({
      from: params.from,
      to: params.to,
      groupBy: params.groupBy,
    });
    if (params.userId) qs.set("userId", params.userId);
    if (params.taskId) qs.set("taskId", params.taskId);
    if (params.entryType) qs.set("entryType", params.entryType);
    return apiFetch<{ summary: ReportSummary }>(
      `/api/reports/summary?${qs.toString()}`,
    ).then((r) => r.summary);
  },
};
