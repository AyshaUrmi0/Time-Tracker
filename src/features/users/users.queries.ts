"use client";

import { useQuery } from "@tanstack/react-query";
import { usersService } from "./users.service";

export function useSelectableUsers() {
  return useQuery({
    queryKey: ["users", "selectable"],
    queryFn: () => usersService.listSelectable(),
    staleTime: 5 * 60 * 1000,
  });
}
