"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { createUserSchema, type CreateUserInput } from "../admin.schema";
import { useCreateAdminUser } from "../admin.queries";

type FieldErrors = Partial<
  Record<"name" | "email" | "password" | "role" | "timezone", string[]>
>;

type Props = {
  open: boolean;
  onClose: () => void;
};

const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

export function InviteUserModal({ open, onClose }: Props) {
  const mutation = useCreateAdminUser();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "MEMBER",
      timezone: "UTC",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        email: "",
        password: "",
        role: "MEMBER",
        timezone: "UTC",
      });
    }
  }, [open, reset]);

  async function onSubmit(values: CreateUserInput) {
    try {
      await mutation.mutateAsync(values);
      onClose();
    } catch (err) {
      const details = (err as { details?: { fieldErrors?: FieldErrors } }).details;
      const fieldErrors = details?.fieldErrors;
      if (fieldErrors) {
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (messages?.[0]) {
            setError(field as keyof CreateUserInput, { message: messages[0] });
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
      title="Add team member"
      description="Create an account with a starting password. They can change it later."
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit(onSubmit)} loading={busy}>
            Add member
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField id="name" label="Full name" error={errors.name?.message}>
          <Input
            id="name"
            autoFocus
            placeholder="Jane Doe"
            error={!!errors.name}
            {...register("name")}
          />
        </FormField>

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="jane@example.com"
            error={!!errors.email}
            {...register("email")}
          />
        </FormField>

        <FormField
          id="password"
          label="Starting password"
          error={errors.password?.message}
          hint="At least 8 characters. Share it securely with the new member."
        >
          <Input
            id="password"
            type="text"
            placeholder="Temp password"
            error={!!errors.password}
            {...register("password")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="role" label="Role" error={errors.role?.message}>
            <select id="role" className={selectClass} {...register("role")}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </FormField>

          <FormField id="timezone" label="Timezone" error={errors.timezone?.message}>
            <Input
              id="timezone"
              placeholder="UTC"
              error={!!errors.timezone}
              {...register("timezone")}
            />
          </FormField>
        </div>
      </form>
    </Dialog>
  );
}
