import type { ReportSummary } from "../types";
import { formatDurationSec, longDateLabel } from "../components/format";

export function generateCsv(summary: ReportSummary): string {
  const rows: string[][] = [];

  rows.push([
    `Report: ${summary.from} to ${summary.to}`,
    `Scope: ${summary.scope}`,
    `Grouped by: ${summary.groupBy}`,
  ]);
  rows.push([
    `Total: ${formatDurationSec(summary.total.seconds)}`,
    `Entries: ${summary.total.entries}`,
  ]);
  rows.push([]);

  const labelHeader =
    summary.groupBy === "day"
      ? "Date"
      : summary.groupBy === "task"
        ? "Task"
        : "User";

  rows.push([labelHeader, "Duration", "Hours", "Entries", "% of Total"]);

  for (const b of summary.buckets) {
    const pct =
      summary.total.seconds > 0
        ? ((b.seconds / summary.total.seconds) * 100).toFixed(1)
        : "0.0";
    const hours = (b.seconds / 3600).toFixed(2);

    let label: string;
    if (summary.groupBy === "day") {
      label = b.date ? longDateLabel(b.date) : (b.label || b.key);
    } else if (summary.groupBy === "task") {
      label = b.task?.title || b.label || b.key;
    } else {
      label = b.user?.name || b.label || b.key;
    }

    rows.push([label, formatDurationSec(b.seconds), hours, String(b.entries), `${pct}%`]);
  }

  return rows.map((r) => r.map(escapeCell).join(",")).join("\n");
}

function escapeCell(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function downloadCsv(summary: ReportSummary, filename?: string) {
  const csv = generateCsv(summary);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `report-${summary.from}-to-${summary.to}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
