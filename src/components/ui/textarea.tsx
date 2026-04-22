"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, error, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[84px] w-full resize-y rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-[border-color,box-shadow] duration-150 ease-out",
          "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
          error ? "border-[var(--danger)]" : "border-[var(--border)]",
          className,
        )}
        {...rest}
      />
    );
  },
);
