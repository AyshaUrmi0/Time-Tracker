import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { timerService } from "@/server/services/timer.service";

export async function POST() {
  try {
    const user = await requireAuth();
    const timer = await timerService.stop(user);
    return NextResponse.json({ timer });
  } catch (err) {
    return handleApiError(err);
  }
}
