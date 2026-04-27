import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg bg-[var(--text-primary)] text-white",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    </div>
  );
}

export function BrandLockup() {
  return (
    <div className="flex items-center gap-2">
      <BrandMark />
      <span className="text-[17px] font-semibold tracking-tight text-[var(--text-primary)]">
        Time Tracker
      </span>
    </div>
  );
}
