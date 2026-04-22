import { cache } from "react";
import { auth as nextAuth } from "@/auth";
import { prisma } from "./prisma";
import { ApiErrors } from "./api-error";
import type { SessionUser } from "@/types";

export type { SessionUser };

export async function auth(): Promise<{ user: SessionUser } | null> {
  const session = await nextAuth();
  if (!session?.user?.id) return null;
  return {
    user: {
      userId: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      role: session.user.role,
      timezone: session.user.timezone,
    },
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.unauthorized();
  return session.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") throw ApiErrors.forbidden();
  return user;
}

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.user.findUnique({
    where: { id: session.user.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      timezone: true,
      isArchived: true,
    },
  });
});
