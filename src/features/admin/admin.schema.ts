import { z } from "zod";
import {
  emailSchema,
  nameSchema,
  passwordSchema,
} from "@/lib/validation";

export const roleSchema = z.enum(["ADMIN", "MEMBER"]);

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    role: roleSchema.optional(),
    isArchived: z.boolean().optional(),
    name: nameSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  archived: z
    .enum(["true", "false", "all"])
    .optional()
    .transform((v) => (v ?? "all") as "true" | "false" | "all"),
  role: roleSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
