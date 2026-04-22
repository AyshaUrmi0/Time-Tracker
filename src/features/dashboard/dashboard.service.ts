import { apiFetch } from "@/lib/api-client";
import type { DashboardSummary } from "./types";

export const dashboardService = {
  summary(userId?: string) {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    return apiFetch<{ summary: DashboardSummary }>(
      `/api/dashboard/summary${qs}`,
    ).then((r) => r.summary);
  },
};
