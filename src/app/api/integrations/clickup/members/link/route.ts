import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { linkMemberSchema } from "@/features/clickup/clickup.schema";
import { clickupMembersService } from "@/server/services/clickup-members.service";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const input = linkMemberSchema.parse(body);
    const result = await clickupMembersService.linkMember(input);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
