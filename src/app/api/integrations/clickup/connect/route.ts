import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupService } from "@/server/services/clickup.service";
import { connectClickUpSchema } from "@/features/clickup/clickup.schema";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const input = connectClickUpSchema.parse(body);
    const status = await clickupService.connect(user, input);
    return NextResponse.json({ status });
  } catch (err) {
    return handleApiError(err);
  }
}
