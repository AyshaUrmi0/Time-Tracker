import { cn } from "@/lib/utils";

type BadgeTone = "default" | "info" | "success" | "warning" | "danger" | "muted";

const tones: Record<BadgeTone, string> = {
  default:
    "bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]",
  info:
    "bg-[var(--accent-soft)] text-[var(--accent-hover)] border border-[color:var(--accent)]/20",
  success:
    "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]/20",
  warning:
    "bg-[#fffbeb] text-[var(--warning)] border border-[var(--warning)]/20",
  danger:
    "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/20",
  muted:
    "bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]",
};

export function Badge({
  tone = "default",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[13px] font-medium tracking-tight",
        tones[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
}
