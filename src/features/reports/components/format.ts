export function formatDurationSec(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHoursDecimal(sec: number): string {
  if (sec <= 0) return "0h";
  const hours = sec / 3600;
  if (hours >= 10) return `${hours.toFixed(0)}h`;
  return `${hours.toFixed(1)}h`;
}

function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y!, month: m!, day: d! };
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

export function startOfMonthYmd(ymd: string): string {
  const { year, month } = parseYmd(ymd);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function endOfMonthYmd(ymd: string): string {
  const { year, month } = parseYmd(ymd);
  const last = new Date(Date.UTC(year, month, 0));
  return `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}-${String(last.getUTCDate()).padStart(2, "0")}`;
}

export function addMonthsYmd(ymd: string, months: number): string {
  const { year, month, day } = parseYmd(ymd);
  const base = new Date(Date.UTC(year, month - 1 + months, day));
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  const aDate = Date.UTC(a.year, a.month - 1, a.day);
  const bDate = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((bDate - aDate) / (24 * 60 * 60 * 1000)) + 1;
}

export function shortDateLabel(ymd: string): string {
  const { year, month, day } = parseYmd(ymd);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function longDateLabel(ymd: string): string {
  const { year, month, day } = parseYmd(ymd);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function weekdayLabel(ymd: string): string {
  const { year, month, day } = parseYmd(ymd);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

export function rangeLabel(fromYmd: string, toYmd: string): string {
  if (fromYmd === toYmd) return longDateLabel(fromYmd);
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  if (a.year !== b.year) {
    return `${longDateLabel(fromYmd)} – ${longDateLabel(toYmd)}`;
  }
  if (a.month !== b.month) {
    return `${shortDateLabel(fromYmd)} – ${longDateLabel(toYmd)}`;
  }
  return `${shortDateLabel(fromYmd)} – ${b.day}, ${b.year}`;
}
