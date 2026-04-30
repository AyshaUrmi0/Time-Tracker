import { z } from "zod";

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  assignedToId: z.string().min(1).optional(),
  archived: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((v) => (v ?? "false") as "true" | "false" | "all"),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
