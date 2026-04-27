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

export function useSyncClickUpMembers() {
  return useMutation({
    mutationFn: () => clickupService.syncMembers(),
    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.linked > 0) parts.push(`${result.linked} linked`);
      if (result.alreadyLinked > 0) parts.push(`${result.alreadyLinked} already linked`);
      if (result.unmatchedEmails.length > 0) {
        parts.push(`${result.unmatchedEmails.length} no email match`);
      }
      const summary = parts.length > 0 ? parts.join(", ") : "No members found.";
      if (result.conflicts.length > 0) {
        toast.info(`${summary} (${result.conflicts.length} conflict${result.conflicts.length === 1 ? "" : "s"})`);
      } else {
        toast.success(summary);
      }
    },
    onError: (err) => toast.error("Couldn't sync members. Please try again.", err),
  });
}

export function usePullClickUpTimeEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days?: number) => clickupService.pullTimeEntries(days),
    onSuccess: (result) => {
      const skipped =
        result.skippedAlreadyLocal +
        result.skippedNoTask +
        result.skippedNoUser +
        result.skippedNoDuration;
      let summary: string;
      if (result.imported === 0 && skipped === 0) {
        summary = `No time entries in the last ${result.windowDays} days.`;
      } else if (result.imported === 0) {
        summary = `Nothing new (${skipped} skipped).`;
      } else {
        summary = `Imported ${result.imported} time entr${result.imported === 1 ? "y" : "ies"}.`;
      }
      if (result.errors.length > 0) {
        toast.info(`${summary} (${result.errors.length} error${result.errors.length === 1 ? "" : "s"})`);
      } else {
        toast.success(summary);
      }
      qc.invalidateQueries({ queryKey: ["time-entries"] });
    },
    onError: (err) => toast.error("Couldn't pull time entries.", err),
  });
}

export function useRegisterClickUpWebhooks() {
  return useMutation({
    mutationFn: () => clickupService.registerWebhooks(),
    onSuccess: (result) => {
      const fresh = result.webhooks.filter((w) => !w.alreadyRegistered && !w.error).length;
      const already = result.webhooks.filter((w) => w.alreadyRegistered).length;
      const failed = result.webhooks.filter((w) => w.error).length;
      const parts: string[] = [];
      if (fresh > 0) parts.push(`${fresh} registered`);
      if (already > 0) parts.push(`${already} already registered`);
      if (failed > 0) parts.push(`${failed} failed`);
      const summary = parts.length > 0 ? parts.join(", ") : "No teams to register.";
      if (failed > 0) toast.info(summary);
      else toast.success(summary);
    },
    onError: (err) => toast.error("Couldn't register webhooks.", err),
  });
}

export function useUnregisterClickUpWebhooks() {
  return useMutation({
    mutationFn: () => clickupService.unregisterWebhooks(),
    onSuccess: (result) => {
      const summary =
        result.removed === 0
          ? "No webhooks were registered."
          : `Removed ${result.removed} webhook${result.removed === 1 ? "" : "s"}.`;
      if (result.failures.length > 0) {
        toast.info(`${summary} (${result.failures.length} delete error${result.failures.length === 1 ? "" : "s"} on ClickUp)`);
      } else {
        toast.success(summary);
      }
    },
    onError: (err) => toast.error("Couldn't unregister webhooks.", err),
  });
}
