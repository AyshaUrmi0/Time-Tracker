import { apiFetch } from "@/lib/api-client";
import type { AdminUser, AdminUserListFilters } from "./types";
import type { CreateUserInput, UpdateUserInput } from "./admin.schema";

function buildQuery(filters: AdminUserListFilters): string {
  const params = new URLSearchParams();
  params.set("archived", filters.archived);
  if (filters.role) params.set("role", filters.role);
  if (filters.search) params.set("search", filters.search);
  return params.toString();
}

export const adminService = {
  listUsers(filters: AdminUserListFilters) {
    return apiFetch<{ users: AdminUser[] }>(
      `/api/admin/users?${buildQuery(filters)}`,
    ).then((r) => r.users);
  },

  createUser(input: CreateUserInput) {
    return apiFetch<{ user: AdminUser }>("/api/admin/users", {
      method: "POST",
      body: input,
    }).then((r) => r.user);
  },

  updateUser(id: string, input: UpdateUserInput) {
    return apiFetch<{ user: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: input,
    }).then((r) => r.user);
  },
};
