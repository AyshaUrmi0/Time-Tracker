import { apiFetch } from "@/lib/api-client";
import type {
  ClickUpConnectionStatus,
  ClickUpMembersSyncResult,
  ClickUpSyncResult,
  ClickUpTimeEntriesPullResult,
  ClickUpWebhookHealthResult,
  ClickUpWebhookRegisterResult,
  ClickUpWebhookUnregisterResult,
} from "./types";
import type { ConnectClickUpInput } from "./clickup.schema";

export const clickupService = {
  status() {
    return apiFetch<{ status: ClickUpConnectionStatus }>(
      "/api/integrations/clickup",
    ).then((r) => r.status);
  },

  connect(input: ConnectClickUpInput) {
    return apiFetch<{ status: ClickUpConnectionStatus }>(
      "/api/integrations/clickup/connect",
      { method: "POST", body: input },
    ).then((r) => r.status);
  },

  disconnect() {
    return apiFetch<{ disconnected: boolean }>(
      "/api/integrations/clickup",
      { method: "DELETE" },
    );
  },

  sync() {
    return apiFetch<{ result: ClickUpSyncResult }>(
      "/api/integrations/clickup/sync",
      { method: "POST" },
    ).then((r) => r.result);
  },

  syncMembers() {
    return apiFetch<{ result: ClickUpMembersSyncResult }>(
      "/api/integrations/clickup/members/sync",
      { method: "POST" },
    ).then((r) => r.result);
  },

  pullTimeEntries(days = 7) {
    return apiFetch<{ result: ClickUpTimeEntriesPullResult }>(
      `/api/integrations/clickup/time-entries/sync?days=${days}`,
      { method: "POST" },
    ).then((r) => r.result);
  },

  registerWebhooks() {
    return apiFetch<{ result: ClickUpWebhookRegisterResult }>(
      "/api/integrations/clickup/webhook/register",
      { method: "POST" },
    ).then((r) => r.result);
  },

  unregisterWebhooks() {
    return apiFetch<{ result: ClickUpWebhookUnregisterResult }>(
      "/api/integrations/clickup/webhook/register",
      { method: "DELETE" },
    ).then((r) => r.result);
  },

  webhookHealth() {
    return apiFetch<{ result: ClickUpWebhookHealthResult }>(
      "/api/integrations/clickup/webhook/health",
    ).then((r) => r.result);
  },

  resetWebhookHealth() {
    return apiFetch<{ result: { reset: number } }>(
      "/api/integrations/clickup/webhook/reset",
      { method: "POST" },
    ).then((r) => r.result);
  },
};
