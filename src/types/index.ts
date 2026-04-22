export type Role = "ADMIN" | "MEMBER";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  timezone: string;
};

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "EMAIL_TAKEN"
  | "TASK_ARCHIVED"
  | "TIMER_ALREADY_RUNNING"
  | "TIMER_RUNNING"
  | "NO_ACTIVE_TIMER"
  | "OVERLAP"
  | "INTERNAL_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: unknown;
  };
};

export type FieldErrors = Record<string, string[]>;
