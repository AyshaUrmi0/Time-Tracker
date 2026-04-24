import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { adminService } from "@/server/services/admin.service";
import {
  createUserSchema,
  listUsersQuerySchema,
} from "@/features/admin/admin.schema";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const query = listUsersQuerySchema.parse(Object.fromEntries(searchParams));
    const users = await adminService.listUsers(query);
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const input = createUserSchema.parse(body);
    const user = await adminService.createUser(input);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
