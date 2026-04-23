import { z } from "zod";

export const calendarWeekQuerySchema = z.object({
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "start must be YYYY-MM-DD"),
  userId: z.string().min(1).optional(),
});

export type CalendarWeekQuery = z.infer<typeof calendarWeekQuerySchema>;
