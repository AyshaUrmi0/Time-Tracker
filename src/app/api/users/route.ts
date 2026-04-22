import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { usersService } from "@/server/services/users.service";

export async function GET() {
  try {
    await requireAuth();
    const users = await usersService.listSelectable();
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}
