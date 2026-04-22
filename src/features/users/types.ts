import type { Role } from "@/types";

export type SelectableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
