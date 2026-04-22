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
import type { Task } from "../types";

type FieldErrors = Partial<
  Record<"title" | "description" | "assignedToId" | "status", string[]>
>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  task?: Task;
  canEdit?: boolean;
  canOwn?: boolean;
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
  canEdit = true,
  canOwn = true,
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
    const isAssigneeOnlyEdit = mode === "edit" && canEdit && !canOwn;
    const payload: CreateTaskInput = isAssigneeOnlyEdit
      ? {
          title: task?.title ?? values.title,
          description: values.description.trim() || undefined,
          status: values.status,
          assignedToId: task?.assignedToId ?? null,
        }
      : {
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
  const readOnly = mode === "edit" && !canEdit;
  const ownerLocked = mode === "edit" && canEdit && !canOwn;

  return (
    <Dialog
      open={open}
      onClose={() => (!busy ? onClose() : null)}
      title={mode === "create" ? "New task" : readOnly ? "Task details" : "Edit task"}
      description={
        readOnly
          ? "Only the creator or an admin can edit this task."
          : ownerLocked
            ? "You're the assignee. Title and assignee can only be changed by the creator or an admin."
            : undefined
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
            autoFocus={!readOnly && !ownerLocked}
            disabled={readOnly || ownerLocked}
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
              className="h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
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
              disabled={readOnly || ownerLocked || usersQuery.isLoading}
              className="h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
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
      </form>
    </Dialog>
  );
}
