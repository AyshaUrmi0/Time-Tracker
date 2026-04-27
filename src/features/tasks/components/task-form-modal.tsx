"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { useSelectableUsers } from "@/features/users/users.queries";
import {
  createTaskSchema,
  updateTaskSchema,
  type CreateTaskInput,
} from "../tasks.schema";
import { useCreateTask, useUpdateTask } from "../tasks.queries";
import { PRIORITY_LABELS, describeDueDate } from "../clickup-task-fields";
import type { Task } from "../types";

type FieldErrors = Partial<
  Record<"title" | "description" | "assignedToId" | "status", string[]>
>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  task?: Task;
  isAdmin: boolean;
};

type FormValues = {
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assignedToId: string;
};

export function TaskFormModal({
  open,
  onClose,
  mode,
  task,
  isAdmin,
}: Props) {
  const usersQuery = useSelectableUsers();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask(task?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(mode === "create" ? createTaskSchema : updateTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      assignedToId: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && task) {
      reset({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        assignedToId: task.assignedToId ?? "",
      });
    } else {
      reset({ title: "", description: "", status: "TODO", assignedToId: "" });
    }
  }, [open, mode, task, reset]);

  async function onSubmit(values: FormValues) {
    const payload: CreateTaskInput = {
      title: values.title,
      description: values.description.trim() || undefined,
      status: values.status,
      assignedToId: values.assignedToId || null,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
      } else if (task) {
        await updateMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      const details = (err as { details?: { fieldErrors?: FieldErrors } }).details;
      const fieldErrors = details?.fieldErrors;
      if (fieldErrors) {
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof FormValues, { message: messages[0] });
          }
        }
      }
    }
  }

  const busy = isSubmitting || createMutation.isPending || updateMutation.isPending;
  const readOnly = !isAdmin;

  return (
    <Dialog
      open={open}
      onClose={() => (!busy ? onClose() : null)}
      title={mode === "create" ? "New task" : readOnly ? "Task details" : "Edit task"}
      description={
        readOnly ? "Only an admin can edit tasks." : undefined
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button
              size="sm"
              onClick={handleSubmit(onSubmit)}
              loading={busy}
            >
              {mode === "create" ? "Create task" : "Save changes"}
            </Button>
          )}
        </>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField id="title" label="Title" error={errors.title?.message}>
          <Input
            id="title"
            autoFocus={!readOnly}
            disabled={readOnly}
            placeholder="What needs to be done?"
            error={!!errors.title}
            {...register("title")}
          />
        </FormField>

        <FormField
          id="description"
          label="Description"
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            disabled={readOnly}
            placeholder="Add context, links, or acceptance criteria."
            error={!!errors.description}
            {...register("description")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="status" label="Status" error={errors.status?.message}>
            <select
              id="status"
              disabled={readOnly}
              className="h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
              {...register("status")}
            >
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </select>
          </FormField>

          <FormField
            id="assignedToId"
            label="Assignee"
            error={errors.assignedToId?.message}
          >
            <select
              id="assignedToId"
              disabled={readOnly || usersQuery.isLoading}
              className="h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
              {...register("assignedToId")}
            >
              <option value="">Unassigned</option>
              {usersQuery.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {mode === "edit" && task?.clickupTaskId && <ClickUpDetailsPanel task={task} />}
      </form>
    </Dialog>
  );
}

function ClickUpDetailsPanel({ task }: { task: Task }) {
  const priority =
    task.clickupPriority !== null ? PRIORITY_LABELS[task.clickupPriority] ?? null : null;
  const due = task.clickupDueDate ? describeDueDate(task.clickupDueDate) : null;
  const location = [task.clickupSpaceName, task.clickupFolderName, task.clickupListName]
    .filter(Boolean)
    .join(" › ");

  return (
    <section className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-4 py-3">
      <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        ClickUp details
      </h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {task.clickupStatus && (
          <Row label="ClickUp status">
            <span className="inline-flex items-center gap-1.5 text-[15px]">
              {task.clickupStatusColor && (
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: task.clickupStatusColor }}
                />
              )}
              <span className="font-medium text-[var(--text-primary)]">
                {task.clickupStatus}
              </span>
            </span>
          </Row>
        )}
        <Row label="Priority">
          {priority ? (
            <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--text-primary)]">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: priority.color }}
              />
              {priority.label}
            </span>
          ) : (
            <Empty />
          )}
        </Row>
        <Row label="Due date">
          {due ? (
            <span
              className={
                due.overdue
                  ? "text-[15px] font-medium text-[var(--danger)]"
                  : "text-[15px] font-medium text-[var(--text-primary)]"
              }
            >
              {due.label}
            </span>
          ) : (
            <Empty />
          )}
        </Row>
        <Row label="Tags">
          {task.clickupTags.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {task.clickupTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[12px] font-medium text-[var(--text-secondary)]"
                >
                  {tag}
                </span>
              ))}
            </span>
          ) : (
            <Empty />
          )}
        </Row>
        {location && (
          <Row label="Location" full>
            <span className="text-[15px] text-[var(--text-secondary)]">{location}</span>
          </Row>
        )}
      </dl>
    </section>
  );
}

function Row({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[12px] text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Empty() {
  return <span className="text-[15px] text-[var(--text-muted)]">Empty</span>;
}
