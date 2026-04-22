"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { signInSchema, type SignInInput } from "@/features/auth/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    setFormError(null);
    const res = await signIn("credentials", { ...values, redirect: false });
    if (!res || res.error) {
      setFormError("Invalid email or password.");
      return;
    }
    router.replace(returnTo);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
          Sign in
        </h1>
        <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
          Enter your email and password to access your time tracker.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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

        <FormField id="password" label="Password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={!!errors.password}
            {...register("password")}
          />
        </FormField>

        {formError && (
          <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]">
            {formError}
          </div>
        )}

        <Button type="submit" className="mt-2 h-11 w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-[13px] text-[var(--text-secondary)]">
        Don&apos;t have an account?{" "}
        <Link
          href={`/sign-up${returnTo && returnTo !== "/dashboard" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
