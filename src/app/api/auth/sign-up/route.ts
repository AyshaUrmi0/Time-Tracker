import { NextResponse } from "next/server";
import { signUpSchema } from "@/features/auth/schemas";
import { authService } from "@/server/services/auth.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = signUpSchema.parse(body);
    const user = await authService.signUp(input);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
