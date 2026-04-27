import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-hover)] text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-[15px] text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
