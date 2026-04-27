"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <div className="relative inline-flex">
      <select
        ref={ref}
        className={cn(
          "h-9 min-w-[140px] appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 pr-8 text-[13px] text-[var(--text-primary)] transition-[border-color,box-shadow] duration-150 ease-out",
          "focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});
