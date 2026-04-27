import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupService } from "@/server/services/clickup.service";

export async function GET() {
  try {
    const user = await requireAdmin();
    const status = await clickupService.getStatus(user);
    return NextResponse.json({ status });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireAdmin();
    const result = await clickupService.disconnect(user);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
