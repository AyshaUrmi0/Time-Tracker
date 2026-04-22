export const BCRYPT_ROUNDS = 12;

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

export const TASK_PAGE_SIZE = 25;
export const ENTRIES_PAGE_SIZE = 25;

export const TOAST_POSITION = "top-right" as const;
export const UNDO_TOAST_DURATION_MS = 5000;

export const PUBLIC_ROUTES = ["/sign-in", "/sign-up"] as const;
