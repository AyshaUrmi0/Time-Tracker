import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block animate-pulse rounded-md bg-[var(--surface-hover)]",
        className,
      )}
    />
  );
}

export function TableRowsSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={j === 0 ? "h-4 flex-1" : "h-4 w-24"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
