import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clickupTimeEntryService } from "@/server/services/clickup-time-entry.service";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 1;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron-pull] CRON_SECRET not configured");
    return NextResponse.json(
      { error: { code: "CRON_NOT_CONFIGURED", message: "CRON_SECRET env var missing" } },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const daysRaw = searchParams.get("days");
  const days = daysRaw ? Number.parseInt(daysRaw, 10) : DEFAULT_DAYS;

  const connections = await prisma.clickUpConnection.findMany({
    where: { isActive: true },
    select: { userId: true },
  });

  const perConnection: Array<{
    connectionUserId: string;
    ok: boolean;
    detail?: unknown;
  }> = [];
  let totalImported = 0;
  let totalSkipped = 0;

  for (const conn of connections) {
    try {
      const result = await clickupTimeEntryService.pullFromClickUp(
        conn.userId,
        { days: Number.isFinite(days) ? days : DEFAULT_DAYS },
      );
      totalImported += result.imported;
      totalSkipped +=
        result.skippedAlreadyLocal +
        result.skippedNoTask +
        result.skippedNoUser +
        result.skippedNoDuration;
      perConnection.push({
        connectionUserId: conn.userId,
        ok: true,
        detail: result,
      });
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 200) ?? "pull failed";
      console.error(`[cron-pull] user ${conn.userId} failed: ${msg}`);
      perConnection.push({
        connectionUserId: conn.userId,
        ok: false,
        detail: msg,
      });
    }
  }

  return NextResponse.json({
    result: {
      connectionsProcessed: connections.length,
      totalImported,
      totalSkipped,
      perConnection,
    },
  });
}
