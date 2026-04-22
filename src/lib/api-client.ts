import type { ApiErrorBody, RequestOpts } from "@/types/api";

export class ApiClientError extends Error {
  code: string;
  status: number;
  details: unknown;
  constructor(status: number, body: ApiErrorBody, fallbackMessage: string) {
    const message = body.error?.message ?? fallbackMessage;
    super(message);
    this.status = status;
    this.code = body.error?.code ?? "UNKNOWN";
    this.details = body.error?.details;
  }
}

export async function apiFetch<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    let body: ApiErrorBody = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = {};
    }
    throw new ApiClientError(res.status, body, `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
