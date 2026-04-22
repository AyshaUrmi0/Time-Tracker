"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "./dashboard.service";

export function useDashboardSummary(userId?: string) {
  return useQuery({
    queryKey: ["dashboard", "summary", userId ?? "self"],
    queryFn: () => dashboardService.summary(userId),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
