import { z } from "zod";

export const startTimerSchema = z.object({
  taskId: z.string().min(1),
  note: z.string().max(2000).optional().nullable(),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;
