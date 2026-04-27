import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupWebhookService } from "@/server/services/clickup-webhook.service";

export async function POST() {
  try {
    const user = await requireAdmin();
    const result = await clickupWebhookService.resetHealth(user);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
