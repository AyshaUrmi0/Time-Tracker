export type ApiErrorBody = {
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type RequestOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

export type ServerErrorShape = {
  code?: string;
  message?: string;
};
