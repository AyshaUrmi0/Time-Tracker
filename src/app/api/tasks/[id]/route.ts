import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { tasksService } from "@/server/services/tasks.service";
import { updateTaskSchema } from "@/features/tasks/tasks.schema";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteCtx) {
  try {
    await requireAuth();
    const { id } = await params;
    const task = await tasksService.getById(id);
    return NextResponse.json({ task });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const input = updateTaskSchema.parse(body);
    const task = await tasksService.update(user, id, input);
    return NextResponse.json({ task });
  } catch (err) {
    return handleApiError(err);
  }
}
