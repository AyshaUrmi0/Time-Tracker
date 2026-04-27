import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupSyncService } from "@/server/services/clickup-sync.service";

export const maxDuration = 60;

export async function POST() {
  try {
    const user = await requireAuth();
    const result = await clickupSyncService.runInitialSync(user);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
