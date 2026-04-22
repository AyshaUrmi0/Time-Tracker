import { z } from "zod";
import { entryNoteSchema, isoDateSchema, LIMITS } from "@/lib/validation";

export const createTimeEntrySchema = z
  .object({
    taskId: z.string().min(1),
    startTime: isoDateSchema,
    endTime: isoDateSchema,
    note: entryNoteSchema,
  })
  .refine(
    (v) => new Date(v.endTime).getTime() > new Date(v.startTime).getTime(),
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

export const updateTimeEntrySchema = z
  .object({
    taskId: z.string().min(1).optional(),
    startTime: isoDateSchema.optional(),
    endTime: isoDateSchema.optional(),
    note: entryNoteSchema,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  })
  .refine(
    (v) => {
      if (v.startTime && v.endTime) {
        return new Date(v.endTime).getTime() > new Date(v.startTime).getTime();
      }
      return true;
    },
    { message: "End time must be after start time", path: ["endTime"] },
  );

export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

export const listTimeEntriesQuerySchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    userId: z.string().min(1).optional(),
    taskId: z.string().min(1).optional(),
  })
  .refine((v) => (v.from == null) === (v.to == null), {
    message: "Provide both `from` and `to` or neither",
    path: ["to"],
  })
  .refine(
    (v) => {
      if (!v.from || !v.to) return true;
      return new Date(v.from).getTime() <= new Date(v.to).getTime();
    },
    { message: "`from` must be on or before `to`", path: ["from"] },
  )
  .refine(
    (v) => {
      if (!v.from || !v.to) return true;
      const span = new Date(v.to).getTime() - new Date(v.from).getTime();
      return span <= LIMITS.dateRangeDays * 24 * 60 * 60 * 1000;
    },
    { message: `Date range cannot exceed ${LIMITS.dateRangeDays} days`, path: ["to"] },
  );

export type ListTimeEntriesQuery = z.infer<typeof listTimeEntriesQuerySchema>;
