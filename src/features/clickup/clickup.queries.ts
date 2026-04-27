"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { clickupService } from "./clickup.service";
import type { ConnectClickUpInput } from "./clickup.schema";

const CLICKUP_STATUS_KEY = ["clickup", "status"] as const;

export function useClickUpStatus() {
  return useQuery({
    queryKey: CLICKUP_STATUS_KEY,
    queryFn: () => clickupService.status(),
  });
}

export function useConnectClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectClickUpInput) => clickupService.connect(input),
    onSuccess: (status) => {
      qc.setQueryData(CLICKUP_STATUS_KEY, status);
      toast.success("ClickUp connected");
    },
    onError: (err) => toast.error("Couldn't connect ClickUp. Please try again.", err),
  });
}

export function useDisconnectClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clickupService.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLICKUP_STATUS_KEY });
      toast.success("ClickUp disconnected");
    },
    onError: (err) => toast.error("Couldn't disconnect. Please try again.", err),
  });
}

export function useSyncClickUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clickupService.sync(),
    onSuccess: (result) => {
      const { tasksImported, tasksUpdated, errors } = result;
      let summary: string;
      if (tasksImported === 0 && tasksUpdated === 0) {
        summary = "No tasks found in ClickUp.";
      } else if (tasksImported > 0 && tasksUpdated > 0) {
        summary = `Imported ${tasksImported}, refreshed ${tasksUpdated}.`;
      } else if (tasksImported > 0) {
        summary = `Imported ${tasksImported} task${tasksImported === 1 ? "" : "s"}.`;
      } else {
        summary = `Refreshed ${tasksUpdated} task${tasksUpdated === 1 ? "" : "s"}.`;
      }

      if (errors.length > 0) {
        toast.info(`${summary} (${errors.length} item${errors.length === 1 ? "" : "s"} skipped)`);
      } else {
        toast.success(summary);
      }
      qc.invalidateQueries({ queryKey: CLICKUP_STATUS_KEY });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => toast.error("Sync failed. Please try again.", err),
  });
}
