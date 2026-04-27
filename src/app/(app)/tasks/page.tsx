"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { TableRowsSkeleton } from "@/components/ui/skeleton";
import { useModal } from "@/contexts/ModalContext";
import { useTasks, useArchiveTask } from "@/features/tasks/tasks.queries";
import { useSelectableUsers } from "@/features/users/users.queries";
import { TasksFilters } from "@/features/tasks/components/tasks-filters";
import { TasksTable } from "@/features/tasks/components/tasks-table";
import { TasksSidebar, type SidebarView } from "@/features/tasks/components/tasks-sidebar";
import { TaskFormModal } from "@/features/tasks/components/task-form-modal";
import { TASK_PAGE_SIZE } from "@/lib/constants";
import type { Task, TaskStatus } from "@/features/tasks/types";

export default function TasksPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const isAdmin = session?.user?.role === "ADMIN";

  const [view, setView] = useState<SidebarView>("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [archived, setArchived] = useState<"false" | "true" | "all">("false");
  const [page, setPage] = useState(1);

  const [formState, setFormState] = useState<
    | { open: false }
    | { open: true; mode: "create" }
    | { open: true; mode: "edit"; task: Task }
  >({ open: false });

  const tasksQuery = useTasks({ archived });
  const usersQuery = useSelectableUsers();
  const archiveMutation = useArchiveTask();
  const modal = useModal();

  const filteredTasks = useMemo(() => {
    const all = tasksQuery.data ?? [];
    return all.filter((t) => {
      if (view === "assigned" && t.assignedToId !== currentUserId) return false;
      if (view === "completed" && t.status !== "DONE") return false;
      if (status !== "all" && t.status !== status) return false;
      if (assignee === "unassigned" && t.assignedToId !== null) return false;
      if (assignee !== "all" && assignee !== "unassigned" && t.assignedToId !== assignee)
        return false;
      return true;
    });
  }, [tasksQuery.data, view, status, assignee, currentUserId]);

  const pagedTasks = useMemo(() => {
    const start = (page - 1) * TASK_PAGE_SIZE;
    return filteredTasks.slice(start, start + TASK_PAGE_SIZE);
  }, [filteredTasks, page]);

  function resetFilters() {
    setStatus("all");
    setAssignee("all");
    setArchived("false");
    setView("all");
    setPage(1);
  }

  async function handleArchive(task: Task) {
    const ok = await modal.confirm({
      title: "Archive this task?",
      description: (
        <>
          <strong>{task.title}</strong> will move to the Archived tab. Time entries are
          kept.
        </>
      ),
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!ok) return;
    archiveMutation.mutate(task.id);
  }

  return (
    <div className="flex gap-6">
      <TasksSidebar
        value={view}
        onChange={(v) => {
          setView(v);
          setPage(1);
        }}
        tasks={tasksQuery.data}
        currentUser={{ userId: currentUserId }}
      />

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text-primary)]">
              Tasks
            </h1>
            <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
              Create, assign, and archive work across your team.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setFormState({ open: true, mode: "create" })}>
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
              New task
            </Button>
          )}
        </div>

        {isAdmin && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-[color:var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 text-[var(--accent-hover)]"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            <div>
              <p className="text-[15px] font-semibold text-[var(--accent-hover)]">
                Admin view
              </p>
              <p className="text-[14px] text-[var(--text-secondary)]">
                You can edit or archive any task. Members can only change tasks they
                created.
              </p>
            </div>
          </div>
        )}

        <div className="mb-4">
          <TasksFilters
            status={status}
            onStatusChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            assignee={assignee}
            onAssigneeChange={(v) => {
              setAssignee(v);
              setPage(1);
            }}
            archived={archived}
            onArchivedChange={(v) => {
              setArchived(v);
              setPage(1);
            }}
            users={usersQuery.data}
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          {tasksQuery.isLoading ? (
            <TableRowsSkeleton rows={6} cols={5} />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks match these filters"
              description="Try clearing the filters or switching to a different view."
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <TasksTable
                tasks={pagedTasks}
                isAdmin={isAdmin}
                onEdit={(task) => setFormState({ open: true, mode: "edit", task })}
                onArchive={handleArchive}
              />
              {filteredTasks.length > TASK_PAGE_SIZE && (
                <Pagination
                  page={page}
                  pageSize={TASK_PAGE_SIZE}
                  total={filteredTasks.length}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      <TaskFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false })}
        mode={formState.open ? formState.mode : "create"}
        task={formState.open && formState.mode === "edit" ? formState.task : undefined}
        isAdmin={isAdmin}
      />
    </div>
  );
}
