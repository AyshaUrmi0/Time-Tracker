import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import type { SignUpInput } from "@/features/auth/auth.schema";

const BCRYPT_ROUNDS = 12;

export const authService = {
  async signUp(input: SignUpInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw ApiErrors.conflict("EMAIL_TAKEN", "That email is already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        timezone: input.timezone ?? "UTC",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        timezone: true,
        createdAt: true,
      },
    });

    return user;
  },

  async verifyCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isArchived) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      timezone: user.timezone,
    };
  },
};
