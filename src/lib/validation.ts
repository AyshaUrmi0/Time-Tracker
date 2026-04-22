import { z } from "zod";

export const LIMITS = {
  name: { min: 1, max: 100 },
  email: { max: 255 },
  password: { min: 8, max: 128 },
  taskTitle: { min: 1, max: 200 },
  taskDescription: { max: 5000 },
  entryNote: { max: 2000 },
  dateRangeDays: 90,
  startTimePastDays: 30,
  endTimeFutureSkewMinutes: 5,
} as const;

export const nameSchema = z
  .string()
  .trim()
  .min(LIMITS.name.min, "Name is required")
  .max(LIMITS.name.max, `Name must be ${LIMITS.name.max} characters or fewer`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email")
  .max(LIMITS.email.max);

export const passwordSchema = z
  .string()
  .min(LIMITS.password.min, `Password must be at least ${LIMITS.password.min} characters`)
  .max(LIMITS.password.max);

export const taskTitleSchema = z
  .string()
  .trim()
  .min(LIMITS.taskTitle.min, "Title is required")
  .max(LIMITS.taskTitle.max);

export const taskDescriptionSchema = z
  .string()
  .max(LIMITS.taskDescription.max)
  .optional()
  .nullable();

export const entryNoteSchema = z
  .string()
  .max(LIMITS.entryNote.max)
  .optional()
  .nullable();

export const isoDateSchema = z.string().datetime({ offset: true });

/** Date-range query helper: enforces `from <= to` and `to - from <= 90 days`. */
export const dateRangeSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine(
    ({ from, to }) => new Date(from).getTime() <= new Date(to).getTime(),
    { message: "`from` must be on or before `to`", path: ["from"] },
  )
  .refine(
    ({ from, to }) => {
      const span = new Date(to).getTime() - new Date(from).getTime();
      return span <= LIMITS.dateRangeDays * 24 * 60 * 60 * 1000;
    },
    { message: `Date range cannot exceed ${LIMITS.dateRangeDays} days`, path: ["to"] },
  );

/** Manual time-entry window checks (client timestamps allowed, validated). */
export function validateManualEntryWindow(startTime: Date, endTime: Date) {
  const now = Date.now();
  const pastLimit = now - LIMITS.startTimePastDays * 24 * 60 * 60 * 1000;
  const futureLimit = now + LIMITS.endTimeFutureSkewMinutes * 60 * 1000;

  if (startTime.getTime() < pastLimit) {
    throw new Error(
      `startTime cannot be more than ${LIMITS.startTimePastDays} days in the past`,
    );
  }
  if (endTime.getTime() > futureLimit) {
    throw new Error("endTime cannot be in the future");
  }
  if (endTime.getTime() <= startTime.getTime()) {
    throw new Error("endTime must be after startTime");
  }
}
