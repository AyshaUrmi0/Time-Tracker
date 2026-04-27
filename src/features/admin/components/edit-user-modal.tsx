"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { updateUserSchema, type UpdateUserInput } from "../admin.schema";
import { useUpdateAdminUser } from "../admin.queries";
import type { AdminUser } from "../types";

type FieldErrors = Partial<Record<"name" | "role", string[]>>;

type Props = {
  open: boolean;
  onClose: () => void;
  user: AdminUser | null;
  currentUserId: string;
};

type FormValues = {
  name: string;
  role: "ADMIN" | "MEMBER";
};

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60";

export function EditUserModal({ open, onClose, user, currentUserId }: Props) {
  const mutation = useUpdateAdminUser();
  const isSelf = user?.id === currentUserId;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: "", role: "MEMBER" },
  });

  useEffect(() => {
    if (open && user) {
      reset({ name: user.name, role: user.role });
    }
  }, [open, user, reset]);

  async function onSubmit(values: FormValues) {
    if (!user) return;
    const patch: UpdateUserInput = {};
    if (values.name !== user.name) patch.name = values.name;
    if (!isSelf && values.role !== user.role) patch.role = values.role;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    try {
      await mutation.mutateAsync({ id: user.id, input: patch });
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

  const busy = isSubmitting || mutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={() => (!busy ? onClose() : null)}
      title="Edit team member"
      description={
        isSelf
          ? "You can update your own name here. Role changes require another admin."
          : undefined
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit(onSubmit)} loading={busy}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField id="edit-name" label="Name" error={errors.name?.message}>
          <Input id="edit-name" error={!!errors.name} {...register("name")} />
        </FormField>

        <FormField id="edit-role" label="Role" error={errors.role?.message}>
          <select
            id="edit-role"
            disabled={isSelf}
            className={selectClass}
            {...register("role")}
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
        </FormField>

        {user && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-[14px] text-[var(--text-muted)]">
            Email: <span className="text-[var(--text-secondary)]">{user.email}</span>
          </div>
        )}
      </form>
    </Dialog>
  );
}
