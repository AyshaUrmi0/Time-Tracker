import { NextResponse, type NextRequest } from "next/server";
import { clickupWebhookService } from "@/server/services/clickup-webhook.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-signature") ?? req.headers.get("X-Signature");
    const result = await clickupWebhookService.processIncoming(
      rawBody,
      signature,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[clickup-webhook] receiver error:", err);
    return NextResponse.json({ ok: true });
  }
}
