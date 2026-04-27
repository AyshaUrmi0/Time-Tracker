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
      const parts: string[] = [];
      if (result.imported > 0) parts.push(`${result.imported} imported`);
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.deletedLocally > 0) parts.push(`${result.deletedLocally} deleted`);
      const summary =
        parts.length > 0
          ? parts.join(", ")
          : `No changes in the last ${result.windowDays} days.`;
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
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ["clickup", "webhook-health"] });
    },
    onError: (err) => toast.error("Couldn't register webhooks.", err),
  });
}

export function useUnregisterClickUpWebhooks() {
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ["clickup", "webhook-health"] });
    },
    onError: (err) => toast.error("Couldn't unregister webhooks.", err),
  });
}

export function useClickUpWebhookHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["clickup", "webhook-health"] as const,
    queryFn: () => clickupService.webhookHealth(),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useResetClickUpWebhookHealth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clickupService.resetWebhookHealth(),
    onSuccess: (result) => {
      if (result.reset === 0) {
        toast.info("No webhooks to reset.");
      } else {
        toast.success(
          `Reset ${result.reset} webhook${result.reset === 1 ? "" : "s"}. Failure counters cleared.`,
        );
      }
      qc.invalidateQueries({ queryKey: ["clickup", "webhook-health"] });
    },
    onError: (err) => toast.error("Couldn't reset webhook health.", err),
  });
}
