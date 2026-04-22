import { apiFetch } from "@/lib/api-client";
import type { TimeEntry, TimeEntryListFilters } from "./types";
import type {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
} from "./time-entries.schema";

function buildQuery(filters: TimeEntryListFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.taskId) params.set("taskId", filters.taskId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const timeEntriesService = {
  list(filters: TimeEntryListFilters = {}) {
    return apiFetch<{ entries: TimeEntry[] }>(
      `/api/time-entries${buildQuery(filters)}`,
    ).then((r) => r.entries);
  },

  create(input: CreateTimeEntryInput) {
    return apiFetch<{ entry: TimeEntry }>("/api/time-entries", {
      method: "POST",
      body: input,
    }).then((r) => r.entry);
  },

  update(id: string, input: UpdateTimeEntryInput) {
    return apiFetch<{ entry: TimeEntry }>(`/api/time-entries/${id}`, {
      method: "PATCH",
      body: input,
    }).then((r) => r.entry);
  },

  remove(id: string) {
    return apiFetch<{ id: string }>(`/api/time-entries/${id}`, {
      method: "DELETE",
    });
  },
};
