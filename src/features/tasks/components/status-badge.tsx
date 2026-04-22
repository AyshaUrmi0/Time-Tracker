import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "../types";

const CONFIG: Record<
  TaskStatus,
  { label: string; tone: "info" | "warning" | "success" }
> = {
  TODO: { label: "To do", tone: "warning" },
  IN_PROGRESS: { label: "In progress", tone: "info" },
  DONE: { label: "Done", tone: "success" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const c = CONFIG[status];
  return (
    <Badge tone={c.tone} dot>
      {c.label}
    </Badge>
  );
}
