"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { signUpSchema, type SignUpInput } from "@/features/auth/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";

type FieldErrors = Partial<Record<keyof SignUpInput, string[]>>;

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", timezone: "UTC" },
  });

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setValue("timezone", tz);
    } catch {
      // keep default "UTC"
    }
  }, [setValue]);

  async function onSubmit(values: SignUpInput) {
    setFormError(null);
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: { code: string; message: string; details?: { fieldErrors?: FieldErrors } } }
        | null;
      const code = data?.error?.code;
      if (code === "VALIDATION_ERROR" && data?.error?.details?.fieldErrors) {
        for (const [field, messages] of Object.entries(data.error.details.fieldErrors)) {
          if (messages?.[0]) setError(field as keyof SignUpInput, { message: messages[0] });
        }
        return;
      }
      if (code === "EMAIL_TAKEN") {
        setError("email", { message: data!.error!.message });
        return;
      }
      setFormError(data?.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    const signed = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (!signed || signed.error) {
      router.replace(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[30px] font-semibold tracking-tight text-[var(--text-primary)]">
          Create account
        </h1>
        <p className="mt-2 text-[16px] text-[var(--text-secondary)]">
          Start tracking time in under a minute.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <FormField id="name" label="Name" error={errors.name?.message}>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Your full name"
            error={!!errors.name}
            {...register("name")}
          />
        </FormField>

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            error={!!errors.email}
            {...register("email")}
          />
        </FormField>

        <FormField id="password" label="Password" error={errors.password?.message} hint="At least 8 characters">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={!!errors.password}
            {...register("password")}
          />
        </FormField>

        <input type="hidden" {...register("timezone")} />

        {formError && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-[15px] text-[var(--danger)]">
            {formError}
          </div>
        )}

        <Button type="submit" className="mt-2 h-11 w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="text-center text-[15px] text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link
          href={`/sign-in${returnTo && returnTo !== "/dashboard" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
