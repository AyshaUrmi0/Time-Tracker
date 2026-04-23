"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportsService, type ReportSummaryParams } from "./reports.service";

export function useReportSummary(
  params: ReportSummaryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [
      "reports",
      "summary",
      params.from,
      params.to,
      params.groupBy,
      params.userId ?? "self",
      params.taskId ?? "all-tasks",
      params.entryType ?? "all-entry-types",
    ],
    queryFn: () => reportsService.summary(params),
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}
