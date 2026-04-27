"use client";

import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  function Label({ className, ...rest }, ref) {
    return (
      <label
        ref={ref}
        className={cn(
          "text-[15px] font-medium text-[var(--text-primary)]",
          className,
        )}
        {...rest}
      />
    );
  },
);
