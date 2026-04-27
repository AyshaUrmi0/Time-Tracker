export const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Urgent", color: "#dc2626" },
  2: { label: "High", color: "#d97706" },
  3: { label: "Normal", color: "#2563eb" },
  4: { label: "Low", color: "#737373" },
};

export function describeDueDate(iso: string): { label: string; overdue: boolean } {
  const due = new Date(iso);
  const now = new Date();
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  const formatted = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: due.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
  if (sameDay) return { label: `${formatted} (today)`, overdue: false };
  const diffDays = Math.round(
    (due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays > 0 && diffDays <= 7) {
    return { label: `${formatted} (in ${diffDays}d)`, overdue: false };
  }
  if (diffDays < 0 && diffDays >= -30) {
    return { label: `${formatted} (${Math.abs(diffDays)}d ago)`, overdue: true };
  }
  return { label: formatted, overdue: diffDays < 0 };
}

export type DueBadge = {
  short: string;
  tone: "danger" | "warning";
};

export function dueBadge(iso: string): DueBadge | null {
  const due = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (due.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      short: overdueDays === 1 ? "1d overdue" : `${overdueDays}d overdue`,
      tone: "danger",
    };
  }
  if (diffDays === 0) return { short: "Due today", tone: "warning" };
  if (diffDays <= 3) return { short: `Due in ${diffDays}d`, tone: "warning" };
  return null;
}
