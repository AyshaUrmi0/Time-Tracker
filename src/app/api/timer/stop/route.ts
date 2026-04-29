import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { timerService } from "@/server/services/timer.service";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = (await req.json().catch(() => ({}))) as { entryId?: string };
    const entryId =
      typeof body.entryId === "string" && body.entryId.length > 0
        ? body.entryId
        : undefined;
    const timer = await timerService.stop(user, entryId);
    return NextResponse.json({ timer });
  } catch (err) {
    return handleApiError(err);
  }
}
