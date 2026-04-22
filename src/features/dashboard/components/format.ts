export function formatDurationSec(sec: number): string {
  if (sec <= 0) return "0m";
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${m}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

export function formatDurationHM(sec: number): string {
  if (sec <= 0) return "0:00";
  const totalMin = Math.floor(sec / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function formatShortDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export function formatDayOfMonth(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
