import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupWebhookService } from "@/server/services/clickup-webhook.service";

export const maxDuration = 60;

function buildEndpoint(req: NextRequest): string {
  const override = process.env.CLICKUP_WEBHOOK_PUBLIC_URL;
  if (override) {
    return `${override.replace(/\/$/, "")}/api/integrations/clickup/webhook`;
  }
  const host = req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/api/integrations/clickup/webhook`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const endpoint = buildEndpoint(req);
    const result = await clickupWebhookService.register(user, endpoint);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();
    const result = await clickupWebhookService.unregister(user);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
