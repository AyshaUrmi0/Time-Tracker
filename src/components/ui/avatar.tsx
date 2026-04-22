import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  id,
  size = 24,
  className,
}: {
  name: string;
  id?: string;
  size?: number;
  className?: string;
}) {
  const palette = PALETTE[hash(id ?? name) % PALETTE.length];
  return (
    <span
      aria-label={name}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold",
        palette,
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.4)),
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
