"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { timeEntriesService } from "./time-entries.service";
import type { TimeEntryListFilters } from "./types";
import type {
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
} from "./time-entries.schema";

const ENTRIES_KEY = ["time-entries", "list"] as const;

export function useTimeEntries(filters: TimeEntryListFilters = {}) {
  return useQuery({
    queryKey: [...ENTRIES_KEY, filters],
    queryFn: () => timeEntriesService.list(filters),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ENTRIES_KEY });
  qc.invalidateQueries({ queryKey: ["timer", "current"] });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimeEntryInput) => timeEntriesService.create(input),
    onSuccess: () => {
      toast.success("Time logged");
      invalidateAll(qc);
    },
    onError: (err) =>
      toast.error("Couldn't log time. Please try again.", err),
  });
}

export function useUpdateTimeEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTimeEntryInput) =>
      timeEntriesService.update(id, input),
    onSuccess: () => {
      toast.success("Entry updated");
      invalidateAll(qc);
    },
    onError: (err) =>
      toast.error("Couldn't save changes. Please try again.", err),
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeEntriesService.remove(id),
    onSuccess: () => {
      toast.success("Entry deleted");
      invalidateAll(qc);
    },
    onError: (err) =>
      toast.error("Couldn't delete entry. Please try again.", err),
  });
}
