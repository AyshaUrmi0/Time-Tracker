"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { tasksService } from "./tasks.service";

const TASKS_KEY = ["tasks", "list"] as const;
const ACTIVE_KEY = [...TASKS_KEY, "active"] as const;
const ARCHIVED_KEY = [...TASKS_KEY, "archived"] as const;

export function useActiveTasks() {
  return useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: () => tasksService.list({ archived: "false" }),
  });
}

export function useArchivedTasks(enabled = true) {
  return useQuery({
    queryKey: ARCHIVED_KEY,
    queryFn: () => tasksService.list({ archived: "true" }),
    enabled,
  });
}

export function useArchiveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksService.archive(id),
    onSuccess: () => {
      toast.success("Task archived");
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (err) => toast.error("Couldn't archive task. Please try again.", err),
  });
}
