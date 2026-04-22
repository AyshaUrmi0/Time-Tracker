import { z } from "zod";
import {
  taskTitleSchema,
  taskDescriptionSchema,
} from "@/lib/validation";

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

const optionalAssigneeId = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().cuid().nullable(),
);

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema,
  assignedToId: optionalAssigneeId,
  status: taskStatusSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema,
    status: taskStatusSchema.optional(),
    assignedToId: optionalAssigneeId,
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  assignedToId: z.string().cuid().optional(),
  archived: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((v) => (v ?? "false") as "true" | "false" | "all"),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
