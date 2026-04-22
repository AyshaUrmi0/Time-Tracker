import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const ApiErrors = {
  unauthorized: (msg = "Authentication required") =>
    new ApiError("UNAUTHORIZED", msg, 401),
  forbidden: (msg = "You don't have permission to perform this action") =>
    new ApiError("FORBIDDEN", msg, 403),
  notFound: (msg = "Not found") => new ApiError("NOT_FOUND", msg, 404),
  validation: (details: unknown, msg = "Invalid input") =>
    new ApiError("VALIDATION_ERROR", msg, 400, details),
  conflict: (code: string, msg: string, details?: unknown) =>
    new ApiError(code, msg, 409, details),
  noActiveTimer: () =>
    new ApiError("NO_ACTIVE_TIMER", "No timer is currently running", 400),
  internal: (msg = "Something went wrong") =>
    new ApiError("INTERNAL_ERROR", msg, 500),
};

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "_";
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: { fieldErrors },
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "A record with these values already exists",
            details: { target: error.meta?.target },
          },
        },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Record not found" } },
        { status: 404 },
      );
    }
  }

  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    { status: 500 },
  );
}
