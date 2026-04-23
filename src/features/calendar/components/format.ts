export function formatDurationSec(sec: number): string {
  if (sec <= 0) return "0m";
  const totalMinutes = Math.floor(sec / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y!, month: m!, day: d! };
}

export function dayOfMonthLabel(ymd: string): string {
  const { day } = parseYmd(ymd);
  return String(day);
}

export function monthLabel(ymd: string, opts: { long?: boolean } = {}): string {
  const { year, month } = parseYmd(ymd);
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString(undefined, {
    month: opts.long ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function weekRangeLabel(startYmd: string, endYmd: string): string {
  const s = parseYmd(startYmd);
  const e = parseYmd(endYmd);
  const sDate = new Date(Date.UTC(s.year, s.month - 1, s.day));
  const eDate = new Date(Date.UTC(e.year, e.month - 1, e.day));
  const sMonth = sDate.toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });
  const eMonth = eDate.toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });
  if (s.year !== e.year) {
    return `${sMonth} ${s.day}, ${s.year} – ${eMonth} ${e.day}, ${e.year}`;
  }
  if (s.month !== e.month) {
    return `${sMonth} ${s.day} – ${eMonth} ${e.day}, ${e.year}`;
  }
  return `${sMonth} ${s.day} – ${e.day}, ${e.year}`;
}

export function todayInTimezone(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const { year, month, day } = parseYmd(ymd);
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localMinutesInTz(iso: string, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10) % 24;
  const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  return h * 60 + m;
}

export function localYmdInTz(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export function formatHourLabel(hour: number): string {
  const h = hour % 24;
  return `${h.toString().padStart(2, "0")}:00`;
}

const TASK_PALETTE = [
  { border: "#6366f1", bg: "#eef2ff", text: "#4338ca" },
  { border: "#ec4899", bg: "#fdf2f8", text: "#be185d" },
  { border: "#14b8a6", bg: "#f0fdfa", text: "#0f766e" },
  { border: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
  { border: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" },
  { border: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
] as const;

export type TaskColor = (typeof TASK_PALETTE)[number];

function hashStringToIndex(s: string, n: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

export function colorForTask(taskId: string): TaskColor {
  return TASK_PALETTE[hashStringToIndex(taskId, TASK_PALETTE.length)]!;
}
