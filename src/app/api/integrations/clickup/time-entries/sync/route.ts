import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupTimeEntryService } from "@/server/services/clickup-time-entry.service";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const daysRaw = searchParams.get("days");
    const days = daysRaw ? Number.parseInt(daysRaw, 10) : undefined;
    const result = await clickupTimeEntryService.pullFromClickUp(user, {
      days: Number.isFinite(days) ? days : undefined,
    });
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
