import { z } from "zod";

export const personalTokenSchema = z
  .string()
  .trim()
  .min(20, "Token looks too short")
  .max(200, "Token looks too long")
  .regex(/^pk_\d+_[A-Z0-9]+$/, "Token must look like pk_<digits>_<chars>");

export const connectClickUpSchema = z.object({
  personalToken: personalTokenSchema,
});

export type ConnectClickUpInput = z.infer<typeof connectClickUpSchema>;

export const linkMemberSchema = z.object({
  localUserId: z.string().min(1, "localUserId is required"),
  clickupUserId: z
    .number()
    .int()
    .positive()
    .nullable(),
  clickupEmail: z.string().email().optional().nullable(),
});

export type LinkMemberInput = z.infer<typeof linkMemberSchema>;
