"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useModal } from "@/contexts/ModalContext";
import { useDisconnectClickUp, useSyncClickUp } from "../clickup.queries";
import type { ClickUpConnectionStatus } from "../types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ClickUpStatusCard({
  status,
}: {
  status: Extract<ClickUpConnectionStatus, { connected: true }>;
}) {
  const disconnect = useDisconnectClickUp();
  const sync = useSyncClickUp();
  const modal = useModal();

  async function handleDisconnect() {
    const ok = await modal.confirm({
      title: "Disconnect ClickUp?",
      description:
        "We'll stop syncing time entries to ClickUp. You can reconnect anytime by pasting the token again.",
      confirmLabel: "Disconnect",
      destructive: true,
    });
    if (!ok) return;
    disconnect.mutate();
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              ClickUp
            </h2>
            <Badge tone="success" dot>
              Connected
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            {status.clickupUserEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => sync.mutate()}
            loading={sync.isPending}
            disabled={disconnect.isPending}
          >
            Sync now
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDisconnect}
            loading={disconnect.isPending}
            disabled={sync.isPending}
          >
            Disconnect
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-[12px] text-[var(--text-muted)]">ClickUp user ID</dt>
          <dd className="mt-0.5 font-medium text-[var(--text-primary)]">
            {status.clickupUserId}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-[var(--text-muted)]">Connected</dt>
          <dd className="mt-0.5 font-medium text-[var(--text-primary)]">
            {formatDateTime(status.connectedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-[12px] text-[var(--text-muted)]">Last sync</dt>
          <dd className="mt-0.5 font-medium text-[var(--text-primary)]">
            {status.lastSyncAt ? formatDateTime(status.lastSyncAt) : "—"}
          </dd>
        </div>
      </dl>

      {status.lastError && (
        <div className="rounded-lg border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]">
          Last sync error: {status.lastError}
        </div>
      )}
    </div>
  );
}
