import { apiFetch } from "@/lib/api-client";
import type { Task, TaskListFilters } from "./types";

function buildTasksQuery(filters: TaskListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.assignedToId && filters.assignedToId !== "unassigned") {
    params.set("assignedToId", filters.assignedToId);
  }
  params.set("archived", filters.archived);
  return params.toString();
}

export const tasksService = {
  list(filters: TaskListFilters) {
    return apiFetch<{ tasks: Task[] }>(
      `/api/tasks?${buildTasksQuery(filters)}`,
    ).then((r) => r.tasks);
  },

  archive(id: string) {
    return apiFetch<{ task: Task }>(`/api/tasks/${id}/archive`, {
      method: "POST",
    }).then((r) => r.task);
  },
};
