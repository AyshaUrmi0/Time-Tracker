"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/contexts/ModalContext";
import {
  usePullClickUpTimeEntries,
  useRegisterClickUpWebhooks,
  useSyncClickUpMembers,
  useUnregisterClickUpWebhooks,
} from "../clickup.queries";

export function ClickUpAdminActions() {
  const [days, setDays] = useState(7);
  const syncMembers = useSyncClickUpMembers();
  const pullTimeEntries = usePullClickUpTimeEntries();
  const registerWebhooks = useRegisterClickUpWebhooks();
  const unregisterWebhooks = useUnregisterClickUpWebhooks();
  const modal = useModal();

  const anyPending =
    syncMembers.isPending ||
    pullTimeEntries.isPending ||
    registerWebhooks.isPending ||
    unregisterWebhooks.isPending;

  async function handleUnregister() {
    const ok = await modal.confirm({
      title: "Unregister all ClickUp webhooks?",
      description:
        "Task changes in ClickUp will stop flowing back to the Time Tracker until you register webhooks again.",
      confirmLabel: "Unregister",
      destructive: true,
    });
    if (!ok) return;
    unregisterWebhooks.mutate();
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
          Admin actions
        </h2>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Manage workspace-wide ClickUp linkage. Each action uses your ClickUp
          connection and affects all users.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ActionRow
          title="Sync members"
          description="Match every ClickUp workspace member to a local user by email and link their clickupUserId. Run once after a new teammate joins ClickUp."
        >
          <Button
            size="sm"
            onClick={() => syncMembers.mutate()}
            loading={syncMembers.isPending}
            disabled={anyPending && !syncMembers.isPending}
          >
            Sync now
          </Button>
        </ActionRow>

        <ActionRow
          title="Pull time entries"
          description="Import time tracked directly in ClickUp into the Time Tracker. The daily cron does this automatically; trigger here for an immediate refresh."
        >
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
              className="h-9 w-20"
              aria-label="Lookback days"
            />
            <span className="text-[12px] text-[var(--text-muted)]">days</span>
            <Button
              size="sm"
              onClick={() => pullTimeEntries.mutate(days)}
              loading={pullTimeEntries.isPending}
              disabled={anyPending && !pullTimeEntries.isPending}
            >
              Pull now
            </Button>
          </div>
        </ActionRow>

        <ActionRow
          title="Webhooks"
          description="Register one webhook per ClickUp team so task changes flow back here in real time. Re-running is safe (idempotent per team)."
        >
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => registerWebhooks.mutate()}
              loading={registerWebhooks.isPending}
              disabled={anyPending && !registerWebhooks.isPending}
            >
              Register
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUnregister}
              loading={unregisterWebhooks.isPending}
              disabled={anyPending && !unregisterWebhooks.isPending}
            >
              Unregister
            </Button>
          </div>
        </ActionRow>
      </div>
    </div>
  );
}

function ActionRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--text-primary)]">{title}</p>
        <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
