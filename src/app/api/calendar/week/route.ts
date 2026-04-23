import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { calendarWeekQuerySchema } from "@/features/calendar/calendar.schema";
import { calendarService } from "@/server/services/calendar.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const query = calendarWeekQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const week = await calendarService.week(user, query);
    return NextResponse.json({ week });
  } catch (err) {
    return handleApiError(err);
  }
}
