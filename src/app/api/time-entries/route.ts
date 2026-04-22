import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { timeEntriesService } from "@/server/services/time-entries.service";
import {
  createTimeEntrySchema,
  listTimeEntriesQuerySchema,
} from "@/features/time-entries/time-entries.schema";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const raw = Object.fromEntries(searchParams);
    const query = listTimeEntriesQuerySchema.parse(raw);
    const entries = await timeEntriesService.list(user, query);
    return NextResponse.json({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const input = createTimeEntrySchema.parse(body);
    const entry = await timeEntriesService.create(user, input);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
