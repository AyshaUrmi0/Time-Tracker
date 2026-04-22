import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiErrors } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        timezone: true,
        isArchived: true,
        createdAt: true,
      },
    });
    if (!user || user.isArchived) throw ApiErrors.unauthorized();
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}
