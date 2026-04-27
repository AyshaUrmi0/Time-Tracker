import { ApiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

const REVOCATION_MESSAGE =
  "ClickUp rejected the token. Reconnect from Settings.";

export function isClickUpInvalidTokenError(err: unknown): boolean {
  return err instanceof ApiError && err.code === "CLICKUP_INVALID_TOKEN";
}

export async function handleClickUpInvalidToken(
  err: unknown,
  connectionUserId: string,
): Promise<void> {
  if (!isClickUpInvalidTokenError(err)) return;
  try {
    await prisma.clickUpConnection.update({
      where: { userId: connectionUserId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        lastError: REVOCATION_MESSAGE,
      },
    });
    console.warn(
      `[clickup-auth] connection ${connectionUserId} marked inactive — token revoked`,
    );
  } catch (markErr) {
    console.error(
      `[clickup-auth] failed to mark connection ${connectionUserId} inactive:`,
      markErr,
    );
  }
}
