"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminService } from "./admin.service";
import type { AdminUserListFilters } from "./types";
import type { CreateUserInput, UpdateUserInput } from "./admin.schema";

const ADMIN_USERS_KEY = ["admin", "users"] as const;

export function useAdminUsers(filters: AdminUserListFilters) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, filters],
    queryFn: () => adminService.listUsers(filters),
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => adminService.createUser(input),
    onSuccess: () => {
      toast.success("Team member added");
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      qc.invalidateQueries({ queryKey: ["users", "selectable"] });
    },
    onError: (err) =>
      toast.error("Couldn't add team member. Please try again.", err),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      adminService.updateUser(id, input),
    onSuccess: () => {
      toast.success("Team member updated");
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      qc.invalidateQueries({ queryKey: ["users", "selectable"] });
    },
    onError: (err) =>
      toast.error("Couldn't save changes. Please try again.", err),
  });
}
