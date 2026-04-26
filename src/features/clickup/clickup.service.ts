import { apiFetch } from "@/lib/api-client";
import type { ClickUpConnectionStatus } from "./types";
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
};
