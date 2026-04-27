import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { clickupMembersService } from "@/server/services/clickup-members.service";

export const maxDuration = 60;

export async function POST() {
  try {
    const user = await requireAdmin();
    const result = await clickupMembersService.syncMembers(user);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
