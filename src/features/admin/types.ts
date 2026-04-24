import type { Role } from "@/types";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  timezone: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserListFilters = {
  archived: "true" | "false" | "all";
  role?: Role;
  search?: string;
};
