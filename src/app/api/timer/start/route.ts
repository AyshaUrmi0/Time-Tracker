import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { timerService } from "@/server/services/timer.service";
import { startTimerSchema } from "@/features/timer/timer.schema";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const input = startTimerSchema.parse(body);
    const result = await timerService.start(user, input);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
