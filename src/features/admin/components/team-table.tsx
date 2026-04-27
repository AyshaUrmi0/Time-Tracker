"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "../types";

type Props = {
  users: AdminUser[];
  currentUserId: string;
  onEdit: (user: AdminUser) => void;
  onArchive: (user: AdminUser) => void;
  onRestore: (user: AdminUser) => void;
};

export function TeamTable({
  users,
  currentUserId,
  onEdit,
  onArchive,
  onRestore,
}: Props) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-[var(--border)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          <th className="px-4 py-2.5 text-left">Name</th>
          <th className="px-4 py-2.5 text-left">Email</th>
          <th className="px-4 py-2.5 text-left">Role</th>
          <th className="px-4 py-2.5 text-left">Timezone</th>
          <th className="px-4 py-2.5 text-left">Joined</th>
          <th className="px-4 py-2.5 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          return (
            <tr
              key={user.id}
              className="text-[13px] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
              data-archived={user.isArchived}
            >
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <Avatar name={user.name} id={user.id} size={26} />
                  <span className="font-medium text-[var(--text-primary)]">
                    {user.name}
                  </span>
                  {isSelf && (
                    <Badge tone="info" className="ml-1">
                      You
                    </Badge>
                  )}
                  {user.isArchived && (
                    <Badge tone="muted" className="ml-1">
                      Archived
                    </Badge>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {user.email}
              </td>
              <td className="px-4 py-3">
                <Badge tone={user.role === "ADMIN" ? "info" : "default"}>
                  {user.role === "ADMIN" ? "Admin" : "Member"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">
                {user.timezone}
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)]">
                {formatDistanceToNowStrict(new Date(user.createdAt), {
                  addSuffix: true,
                })}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(user)}>
                    Edit
                  </Button>
                  {user.isArchived ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRestore(user)}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--danger)] hover:text-[var(--danger)]"
                      disabled={isSelf}
                      onClick={() => onArchive(user)}
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
