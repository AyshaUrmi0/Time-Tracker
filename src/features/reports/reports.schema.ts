import { z } from "zod";
import { LIMITS } from "@/lib/validation";

export const reportGroupBySchema = z.enum(["day", "task", "user"]);

export const reportSummaryQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD"),
    groupBy: reportGroupBySchema,
    userId: z.string().min(1).optional(),
    taskId: z.string().min(1).optional(),
    entryType: z.enum(["timer", "manual"]).optional(),
  })
  .refine((v) => v.from <= v.to, {
    message: "`from` must be on or before `to`",
    path: ["from"],
  })
  .refine(
    (v) => {
      const start = new Date(`${v.from}T00:00:00Z`).getTime();
      const end = new Date(`${v.to}T00:00:00Z`).getTime();
      return end - start <= LIMITS.dateRangeDays * 24 * 60 * 60 * 1000;
    },
    {
      message: `Date range cannot exceed ${LIMITS.dateRangeDays} days`,
      path: ["to"],
    },
  );

export type ReportSummaryQuery = z.infer<typeof reportSummaryQuerySchema>;
