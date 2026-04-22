import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { timeEntriesService } from "@/server/services/time-entries.service";
import { updateTimeEntrySchema } from "@/features/time-entries/time-entries.schema";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteCtx) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const entry = await timeEntriesService.getById(user, id);
    return NextResponse.json({ entry });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const input = updateTimeEntrySchema.parse(body);
    const entry = await timeEntriesService.update(user, id, input);
    return NextResponse.json({ entry });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteCtx) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const result = await timeEntriesService.remove(user, id);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
