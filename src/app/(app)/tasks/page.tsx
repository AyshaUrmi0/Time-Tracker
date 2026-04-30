'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { useModal } from '@/contexts/ModalContext';
import {
  useActiveTasks,
  useArchivedTasks,
  useArchiveTask,
} from '@/features/tasks/tasks.queries';
import { useSelectableUsers } from '@/features/users/users.queries';
import { TasksFilters } from '@/features/tasks/components/tasks-filters';
import { TasksTable } from '@/features/tasks/components/tasks-table';
import {
  TasksSidebar,
  type SidebarView,
} from '@/features/tasks/components/tasks-sidebar';
import { TASK_PAGE_SIZE } from '@/lib/constants';
import type { Task, TaskStatus } from '@/features/tasks/types';

export default function TasksPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const isAdmin = session?.user?.role === 'ADMIN';

  const [view, setView] = useState<SidebarView>('all');
  const [status, setStatus] = useState<TaskStatus | 'all'>('all');
  const [assignee, setAssignee] = useState<string>('all');
  const [archived, setArchived] = useState<'false' | 'true'>('false');
  const [page, setPage] = useState(1);

  const activeQuery = useActiveTasks();
  const archivedQuery = useArchivedTasks(archived === 'true');
  const tasksQuery = archived === 'true' ? archivedQuery : activeQuery;
  const usersQuery = useSelectableUsers();
  const archiveMutation = useArchiveTask();
  const modal = useModal();

  const filteredTasks = useMemo(() => {
    const all = tasksQuery.data ?? [];
    return all.filter((t) => {
      if (view === 'assigned' && t.assignedToId !== currentUserId) return false;
      if (view === 'completed' && t.status !== 'DONE') return false;
      if (status !== 'all' && t.status !== status) return false;
      if (assignee === 'unassigned' && t.assignedToId !== null) return false;
      if (
        assignee !== 'all' &&
        assignee !== 'unassigned' &&
        t.assignedToId !== assignee
      )
        return false;
      return true;
    });
  }, [tasksQuery.data, view, status, assignee, currentUserId]);

  const pagedTasks = useMemo(() => {
    const start = (page - 1) * TASK_PAGE_SIZE;
    return filteredTasks.slice(start, start + TASK_PAGE_SIZE);
  }, [filteredTasks, page]);

  function resetFilters() {
    setStatus('all');
    setAssignee('all');
    setArchived('false');
    setView('all');
    setPage(1);
  }

  async function handleArchive(task: Task) {
    const ok = await modal.confirm({
      title: 'Archive this task?',
      description: (
        <>
          <strong>{task.title}</strong> will move to the Archived tab. Time
          entries are kept.
        </>
      ),
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (!ok) return;
    archiveMutation.mutate(task.id);
  }

  return (
    <div className='flex gap-6'>
      <TasksSidebar
        value={view}
        onChange={(v) => {
          setView(v);
          setPage(1);
        }}
        tasks={activeQuery.data}
        currentUser={{ userId: currentUserId }}
      />

      <div className='min-w-0 flex-1'>
        <div className='mb-6'>
          <h1 className='text-[24px] font-semibold tracking-tight text-[var(--text-primary)]'>
            Tasks
          </h1>
          <p className='mt-1 text-[15px] text-[var(--text-secondary)]'>
            Tasks sync from ClickUp. Create or edit them in ClickUp; admins can
            archive here.
          </p>
        </div>

        <div className='mb-4'>
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

        <div className='rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]'>
          {tasksQuery.isLoading ? (
            <TableRowsSkeleton rows={6} cols={5} />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              title='No tasks match these filters'
              description='Try clearing the filters or switching to a different view.'
              action={
                <Button variant='secondary' size='sm' onClick={resetFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <>
              <TasksTable
                tasks={pagedTasks}
                isAdmin={isAdmin}
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
    </div>
  );
}
