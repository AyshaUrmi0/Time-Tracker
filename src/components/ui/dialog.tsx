"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DialogSize = "sm" | "md" | "lg";

export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
  showCloseButton = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: DialogSize;
  children?: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
  }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-12"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-[rgba(28,25,23,0.45)] backdrop-blur-[2px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        className={cn(
          "relative flex max-h-[calc(100vh-6rem)] w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]",
          sizeClass,
        )}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-md text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {(title || description) && (
          <div className="shrink-0 border-b border-[var(--border)] px-5 py-4 pr-12">
            {title && (
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
