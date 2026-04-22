import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  userId: z.string().min(1).optional(),
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>;
