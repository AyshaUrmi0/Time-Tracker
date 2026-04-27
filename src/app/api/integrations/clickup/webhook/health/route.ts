import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupWebhookService } from "@/server/services/clickup-webhook.service";

export async function GET() {
  try {
    const user = await requireAdmin();
    const result = await clickupWebhookService.getHealth(user);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
