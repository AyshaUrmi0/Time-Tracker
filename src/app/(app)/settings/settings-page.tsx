"use client";

import { useSession } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useClickUpStatus } from "@/features/clickup/clickup.queries";
import { ClickUpAdminActions } from "@/features/clickup/components/clickup-admin-actions";
import { ClickUpConnectForm } from "@/features/clickup/components/clickup-connect-form";
import { ClickUpStatusCard } from "@/features/clickup/components/clickup-status-card";

export function SettingsPageView() {
  const statusQuery = useClickUpStatus();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isConnected = statusQuery.data?.connected === true;

  return (
    <div className="mx-auto max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Manage integrations and personal preferences.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Integrations
        </h2>

        {statusQuery.isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : statusQuery.data?.connected ? (
          <ClickUpStatusCard status={statusQuery.data} />
        ) : (
          <ClickUpConnectForm
            reconnectReason={statusQuery.data?.lastError ?? null}
          />
        )}

        {isAdmin && isConnected && <ClickUpAdminActions />}
      </section>
    </div>
  );
}
