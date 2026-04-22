import { toast as sonner } from "sonner";
import type { ServerErrorShape } from "@/types/api";

const friendlyByCode: Record<string, string> = {
  UNAUTHORIZED: "You've been signed out. Please sign in again.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "That item no longer exists.",
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  EMAIL_TAKEN: "That email is already in use.",
  TASK_ARCHIVED: "This task is archived. Unarchive it first to make changes.",
  TIMER_ALREADY_RUNNING: "A timer is already running — stop it first.",
  NO_ACTIVE_TIMER: "No timer is running right now.",
  OVERLAP: "This time overlaps with another entry.",
  INTERNAL_ERROR: "Something went wrong on our end. Please try again.",
};

const NETWORK_MESSAGE =
  "Connection issue. Check your internet and try again.";

function asServerError(err: unknown): ServerErrorShape | null {
  if (!err) return null;
  if (typeof err === "object" && err !== null) {
    const e = err as { error?: ServerErrorShape; code?: string; message?: string };
    if (e.error && typeof e.error === "object") return e.error;
    if (e.code || e.message) return { code: e.code, message: e.message };
  }
  return null;
}

export const toast = {
  success(message: string) {
    sonner.success(message);
  },

  error(fallback: string, err?: unknown) {
    const parsed = asServerError(err);
    const code = parsed?.code;
    if (code && friendlyByCode[code]) {
      sonner.error(friendlyByCode[code]);
      return;
    }
    if (err instanceof TypeError || (err as { name?: string })?.name === "NetworkError") {
      sonner.error(NETWORK_MESSAGE);
      return;
    }
    sonner.error(fallback);
  },

  info(message: string) {
    sonner(message);
  },
};

export function friendlyErrorMessage(err: unknown, fallback: string): string {
  const parsed = asServerError(err);
  const code = parsed?.code;
  if (code && friendlyByCode[code]) return friendlyByCode[code];
  return fallback;
}
