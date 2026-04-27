"use client";

import type { ReactNode } from "react";
import { Label } from "./label";

export function FormField({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-[12px] text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
