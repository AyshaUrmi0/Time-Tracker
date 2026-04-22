import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { tasksService } from "@/server/services/tasks.service";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: RouteCtx) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const task = await tasksService.archive(user, id);
    return NextResponse.json({ task });
  } catch (err) {
    return handleApiError(err);
  }
}
