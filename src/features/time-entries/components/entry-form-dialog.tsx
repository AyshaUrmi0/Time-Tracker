"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSession } from "next-auth/react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { useTasks } from "@/features/tasks/tasks.queries";
import {
  useCreateTimeEntry,
  useUpdateTimeEntry,
} from "../time-entries.queries";
import type { TimeEntry } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  entry?: TimeEntry;
  canEdit?: boolean;
  initial?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    taskId?: string;
  };
};

type FormValues = {
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
};

type FieldErrors = Partial<
  Record<"taskId" | "startTime" | "endTime" | "date" | "note" | "_", string[]>
>;

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultValues(): FormValues {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(start.getMinutes() - 30, 0, 0);
  const end = new Date(now);
  end.setSeconds(0, 0);
  return {
    taskId: "",
    date: toLocalDate(end),
    startTime: toLocalTime(start),
    endTime: toLocalTime(end),
    note: "",
  };
}

function combineToIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function formatDuration(date: string, start: string, end: string): string {
  if (!date || !start || !end) return "—";
  const s = new Date(`${date}T${start}`).getTime();
  const e = new Date(`${date}T${end}`).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return "—";
  const totalMinutes = Math.floor((e - s) / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function EntryFormDialog({
  open,
  onClose,
  mode,
  entry,
  canEdit = true,
  initial,
}: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";
  const tasksQuery = useTasks({ archived: "false" });
  const createMutation = useCreateTimeEntry();
  const updateMutation = useUpdateTimeEntry(entry?.id ?? "");

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && entry) {
      const start = new Date(entry.startTime);
      const end = entry.endTime ? new Date(entry.endTime) : new Date();
      reset({
        taskId: entry.taskId,
        date: toLocalDate(start),
        startTime: toLocalTime(start),
        endTime: toLocalTime(end),
        note: entry.note ?? "",
      });
    } else {
      reset({ ...defaultValues(), ...(initial ?? {}) });
    }
  }, [open, mode, entry, initial, reset]);

  const watchedDate = useWatch({ control, name: "date" });
  const watchedStart = useWatch({ control, name: "startTime" });
  const watchedEnd = useWatch({ control, name: "endTime" });
  const duration = useMemo(
    () => formatDuration(watchedDate, watchedStart, watchedEnd),
    [watchedDate, watchedStart, watchedEnd],
  );

  const taskGroups = useMemo(() => {
    const list = [...(tasksQuery.data ?? [])];
    if (mode === "edit" && entry) {
      const hasCurrent = list.some((t) => t.id === entry.taskId);
      if (!hasCurrent) {
        list.push({
          id: entry.taskId,
          title: entry.task.title + " (archived)",
          status: entry.task.status,
          isArchived: true,
          createdById: "",
          assignedToId: null,
          description: null,
          createdAt: "",
          updatedAt: "",
          createdBy: { id: "", name: "", email: "" },
          assignedTo: null,
          clickupTaskId: null,
          clickupUrl: null,
          clickupLastSyncedAt: null,
        });
      }
    }

    const mine: typeof list = [];
    const byMe: typeof list = [];
    const unassigned: typeof list = [];
    const others: typeof list = [];
    for (const t of list) {
      if (t.assignedToId && t.assignedToId === currentUserId) mine.push(t);
      else if (t.createdById === currentUserId) byMe.push(t);
      else if (t.assignedToId === null) unassigned.push(t);
      else others.push(t);
    }
    return { mine, byMe, unassigned, others };
  }, [tasksQuery.data, mode, entry, currentUserId]);

  async function onSubmit(values: FormValues) {
    if (!values.taskId) {
      setError("taskId", { message: "Pick a task" });
      return;
    }
    if (!values.date) {
      setError("date", { message: "Pick a date" });
      return;
    }
    if (!values.startTime) {
      setError("startTime", { message: "Set a start time" });
      return;
    }
    if (!values.endTime) {
      setError("endTime", { message: "Set an end time" });
      return;
    }

    const startIso = combineToIso(values.date, values.startTime);
    const endIso = combineToIso(values.date, values.endTime);
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError("endTime", { message: "End time must be after start time" });
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          taskId: values.taskId,
          startTime: startIso,
          endTime: endIso,
          note: values.note.trim() || undefined,
        });
      } else if (entry) {
        await updateMutation.mutateAsync({
          taskId: values.taskId,
          startTime: startIso,
          endTime: endIso,
          note: values.note.trim() || null,
        });
      }
      onClose();
    } catch (err) {
      const e = err as {
        code?: string;
        details?: { fieldErrors?: FieldErrors };
      };
      const fieldErrors = e.details?.fieldErrors;
      if (fieldErrors) {
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages?.[0] && field !== "_") {
            setError(field as keyof FormValues, { message: messages[0] });
          }
        }
      }
      if (e.code === "OVERLAP") {
        setError("startTime", {
          message: "This time overlaps with another entry",
        });
      }
    }
  }

  const busy = isSubmitting || createMutation.isPending || updateMutation.isPending;
  const readOnly = mode === "edit" && !canEdit;

  return (
    <Dialog
      open={open}
      onClose={() => (!busy ? onClose() : null)}
      title={
        mode === "create"
          ? "Log time"
          : readOnly
            ? "Entry details"
            : "Edit entry"
      }
      description={
        readOnly
          ? "Only the entry's creator or an admin can edit this."
          : undefined
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={handleSubmit(onSubmit)} loading={busy}>
              {mode === "create" ? "Log time" : "Save changes"}
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
        <FormField id="taskId" label="Task" error={errors.taskId?.message}>
          <select
            id="taskId"
            autoFocus={!readOnly}
            disabled={readOnly || tasksQuery.isLoading}
            className="h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
            {...register("taskId")}
          >
            <option value="">Select a task…</option>
            {taskGroups.mine.length > 0 && (
              <optgroup label="Assigned to me">
                {taskGroups.mine.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.isArchived}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            )}
            {taskGroups.byMe.length > 0 && (
              <optgroup label="Created by me">
                {taskGroups.byMe.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.isArchived}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            )}
            {taskGroups.unassigned.length > 0 && (
              <optgroup label="Unassigned">
                {taskGroups.unassigned.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.isArchived}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            )}
            {taskGroups.others.length > 0 && (
              <optgroup label="Team">
                {taskGroups.others.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.isArchived}>
                    {t.title}
                    {t.assignedTo ? ` · ${t.assignedTo.name}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </FormField>

        <FormField id="date" label="Date" error={errors.date?.message}>
          <Input
            id="date"
            type="date"
            disabled={readOnly}
            error={!!errors.date}
            {...register("date")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="startTime"
            label="Start"
            error={errors.startTime?.message}
          >
            <Input
              id="startTime"
              type="time"
              step={60}
              disabled={readOnly}
              error={!!errors.startTime}
              {...register("startTime")}
            />
          </FormField>

          <FormField id="endTime" label="End" error={errors.endTime?.message}>
            <Input
              id="endTime"
              type="time"
              step={60}
              disabled={readOnly}
              error={!!errors.endTime}
              {...register("endTime")}
            />
          </FormField>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2">
          <span className="text-[12px] text-[var(--text-secondary)]">Duration</span>
          <span className="tabular text-[13px] font-semibold text-[var(--text-primary)]">
            {duration}
          </span>
        </div>

        <FormField id="note" label="Note" error={errors.note?.message}>
          <Textarea
            id="note"
            disabled={readOnly}
            placeholder="What did you work on? (optional)"
            error={!!errors.note}
            {...register("note")}
          />
        </FormField>
      </form>
    </Dialog>
  );
}
