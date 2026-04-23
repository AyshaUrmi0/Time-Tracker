import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportSummary } from "../types";
import { formatDurationSec, longDateLabel } from "../components/format";

const ACCENT = [99, 102, 241] as const; // #6366f1
const TEXT = [28, 25, 23] as const;
const MUTED = [168, 162, 158] as const;

export function downloadPdf(summary: ReportSummary, filename?: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(20);
  doc.setTextColor(...TEXT);
  doc.text("Reports & Analytics", 14, y);
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(
    `${summary.from} to ${summary.to}  ·  ${summary.scope === "team" ? "Team" : "Individual"}  ·  Grouped by ${summary.groupBy}`,
    14,
    y,
  );
  y += 4;

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(14, y, pageW - 14, y);
  y += 10;

  const totalHours = (summary.total.seconds / 3600).toFixed(1);
  const avgPerDay =
    summary.buckets.length > 0
      ? formatDurationSec(Math.round(summary.total.seconds / summary.buckets.length))
      : "0m";

  const statsData = [
    ["Total Tracked", formatDurationSec(summary.total.seconds)],
    ["Total Hours", `${totalHours}h`],
    ["Avg / Day", avgPerDay],
    ["Entries", String(summary.total.entries)],
    ["Scope", summary.scope === "team" ? "Team" : "Individual"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: statsData,
    theme: "grid",
    headStyles: {
      fillColor: [...ACCENT],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [...TEXT] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
    tableWidth: 90,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY as number) ?? y + 40;
  y += 10;

  const tableHead =
    summary.groupBy === "day"
      ? [["Date", "Duration", "Hours", "Entries"]]
      : summary.groupBy === "task"
        ? [["Task", "Duration", "Hours", "Entries", "% of Total"]]
        : [["User", "Duration", "Hours", "Entries", "% of Total"]];

  const tableBody = summary.buckets.map((b) => {
    const pct =
      summary.total.seconds > 0
        ? ((b.seconds / summary.total.seconds) * 100).toFixed(1) + "%"
        : "0%";
    const hours = (b.seconds / 3600).toFixed(2);

    let label: string;
    if (summary.groupBy === "day") {
      label = b.date ? longDateLabel(b.date) : (b.label || b.key);
    } else if (summary.groupBy === "task") {
      label = b.task?.title || b.label || b.key;
    } else {
      label = b.user?.name || b.label || b.key;
    }

    const base = [label, formatDurationSec(b.seconds), hours, String(b.entries)];
    return summary.groupBy === "day" ? base : [...base, pct];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [...ACCENT],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [...TEXT] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  });

  const finalName = filename ?? `report-${summary.from}-to-${summary.to}.pdf`;
  doc.save(finalName);
}
