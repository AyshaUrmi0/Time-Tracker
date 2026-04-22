import { z } from "zod";
import {
  emailSchema,
  nameSchema,
  passwordSchema,
} from "@/lib/validation";

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  timezone: z.string().trim().min(1).max(64).optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;
