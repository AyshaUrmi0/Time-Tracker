// Auth helpers (stubs in project-setup; full implementation in feature/auth-api).
// Usage: await requireAuth() / requireAdmin() in route handlers.

import { ApiErrors } from "./api-error";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  timezone: string;
};

/** Stub: returns null in V1 project-setup. Replaced in feature/auth-api. */
export async function auth(): Promise<{ user: SessionUser } | null> {
  return null;
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

/**
 * Returns the full user record from the DB for the current session.
 * Stub returns null until auth-api feature ships.
 */
export async function getCurrentUser() {
  return null;
}
