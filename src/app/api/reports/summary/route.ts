import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { reportSummaryQuerySchema } from "@/features/reports/reports.schema";
import { reportsService } from "@/server/services/reports.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const query = reportSummaryQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );
    const summary = await reportsService.summary(user, query);
    return NextResponse.json({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}
