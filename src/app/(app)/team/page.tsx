"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableRowsSkeleton } from "@/components/ui/skeleton";
import { useModal } from "@/contexts/ModalContext";
import {
  useAdminUsers,
  useUpdateAdminUser,
} from "@/features/admin/admin.queries";
import { TeamFilters } from "@/features/admin/components/team-filters";
import { TeamTable } from "@/features/admin/components/team-table";
import { InviteUserModal } from "@/features/admin/components/invite-user-modal";
import { EditUserModal } from "@/features/admin/components/edit-user-modal";
import type { AdminUser } from "@/features/admin/types";
import type { Role } from "@/types";

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const isAdmin = session?.user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [archived, setArchived] = useState<"false" | "true" | "all">("false");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const debouncedSearch = useDebounced(search);

  const usersQuery = useAdminUsers({
    archived,
    role: role === "all" ? undefined : role,
    search: debouncedSearch.trim() || undefined,
  });

  const updateMutation = useUpdateAdminUser();
  const modal = useModal();

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  async function handleArchive(user: AdminUser) {
    if (user.id === currentUserId) return;
    const ok = await modal.confirm({
      title: "Archive this member?",
      description: (
        <>
          <strong>{user.name}</strong> will lose access and stop appearing in
          assignee pickers. You can restore them anytime.
        </>
      ),
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!ok) return;
    updateMutation.mutate({ id: user.id, input: { isArchived: true } });
  }

  async function handleRestore(user: AdminUser) {
    const ok = await modal.confirm({
      title: "Restore this member?",
      description: (
        <>
          <strong>{user.name}</strong> will regain access and reappear in
          pickers.
        </>
      ),
      confirmLabel: "Restore",
    });
    if (!ok) return;
    updateMutation.mutate({ id: user.id, input: { isArchived: false } });
  }

  if (status === "loading") {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <TableRowsSkeleton rows={5} cols={5} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <EmptyState
          title="Admins only"
          description="Only admins can manage the team. Ask an admin if you need access."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            Team
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Manage roles, archive former members, and add new people.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add member
        </Button>
      </div>

      <div className="mb-4">
        <TeamFilters
          search={search}
          onSearchChange={setSearch}
          role={role}
          onRoleChange={setRole}
          archived={archived}
          onArchivedChange={setArchived}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
        {usersQuery.isLoading ? (
          <TableRowsSkeleton rows={6} cols={6} />
        ) : users.length === 0 ? (
          <EmptyState
            title="No team members match these filters"
            description="Try clearing filters or adjusting your search."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setRole("all");
                  setArchived("false");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <TeamTable
            users={users}
            currentUserId={currentUserId}
            onEdit={setEditing}
            onArchive={handleArchive}
            onRestore={handleRestore}
          />
        )}
      </div>

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <EditUserModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        user={editing}
        currentUserId={currentUserId}
      />
    </div>
  );
}
