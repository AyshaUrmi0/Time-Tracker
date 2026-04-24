import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { adminService } from "@/server/services/admin.service";
import { updateUserSchema } from "@/features/admin/admin.schema";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const input = updateUserSchema.parse(body);
    const user = await adminService.updateUser(actor, id, input);
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
