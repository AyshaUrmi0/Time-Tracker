"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { tasksService } from "./tasks.service";
import type { TaskListFilters } from "./types";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.schema";

const TASKS_KEY = ["tasks", "list"] as const;

export function useTasks(filters: TaskListFilters) {
  return useQuery({
    queryKey: [...TASKS_KEY, filters],
    queryFn: () => tasksService.list(filters),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksService.create(input),
    onSuccess: () => {
      toast.success("Task created");
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (err) => toast.error("Couldn't create task. Please try again.", err),
  });
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => tasksService.update(id, input),
    onSuccess: () => {
      toast.success("Task updated");
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
    onError: (err) => toast.error("Couldn't save changes. Please try again.", err),
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
