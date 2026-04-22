import { apiFetch } from "@/lib/api-client";
import type { SelectableUser } from "./types";

export const usersService = {
  listSelectable() {
    return apiFetch<{ users: SelectableUser[] }>("/api/users").then((r) => r.users);
  },
};
