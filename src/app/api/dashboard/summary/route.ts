import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { dashboardSummaryQuerySchema } from "@/features/dashboard/dashboard.schema";
import { dashboardService } from "@/server/services/dashboard.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const query = dashboardSummaryQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const summary = await dashboardService.summary(user, query);
    return NextResponse.json({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}
