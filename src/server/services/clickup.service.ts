import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { encrypt } from "@/lib/encryption";
import { fetchClickUpUser } from "@/lib/clickup/client";
import type { ConnectClickUpInput } from "@/features/clickup/clickup.schema";
import type { ClickUpConnectionStatus } from "@/features/clickup/types";
import type { SessionUser } from "@/types";

export const clickupService = {
  async getStatus(actor: SessionUser): Promise<ClickUpConnectionStatus> {
    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: {
        clickupUserId: true,
        clickupUserEmail: true,
        connectedAt: true,
        lastSyncAt: true,
        lastError: true,
        isActive: true,
        revokedAt: true,
      },
    });

    if (!conn || !conn.isActive || conn.revokedAt) {
      return { connected: false };
    }

    return {
      connected: true,
      clickupUserId: conn.clickupUserId,
      clickupUserEmail: conn.clickupUserEmail,
      connectedAt: conn.connectedAt.toISOString(),
      lastSyncAt: conn.lastSyncAt ? conn.lastSyncAt.toISOString() : null,
      lastError: conn.lastError,
    };
  },

  async connect(actor: SessionUser, input: ConnectClickUpInput) {
    const clickupUser = await fetchClickUpUser(input.personalToken);

    const otherOwner = await prisma.clickUpConnection.findFirst({
      where: {
        clickupUserId: clickupUser.id,
        userId: { not: actor.userId },
        isActive: true,
      },
      select: { id: true },
    });
    if (otherOwner) {
      throw ApiErrors.conflict(
        "CLICKUP_TOKEN_IN_USE",
        "This ClickUp account is already connected to a different team member.",
      );
    }

    const { encrypted, iv } = encrypt(input.personalToken);

    const conn = await prisma.clickUpConnection.upsert({
      where: { userId: actor.userId },
      create: {
        userId: actor.userId,
        accessTokenEncrypted: encrypted,
        encryptionIv: iv,
        clickupUserId: clickupUser.id,
        clickupUserEmail: clickupUser.email,
        isActive: true,
      },
      update: {
        accessTokenEncrypted: encrypted,
        encryptionIv: iv,
        clickupUserId: clickupUser.id,
        clickupUserEmail: clickupUser.email,
        isActive: true,
        revokedAt: null,
        lastError: null,
      },
      select: {
        clickupUserId: true,
        clickupUserEmail: true,
        connectedAt: true,
        lastSyncAt: true,
        lastError: true,
      },
    });

    await prisma.user.update({
      where: { id: actor.userId },
      data: { clickupUserId: clickupUser.id, clickupEmail: clickupUser.email },
    });

    const status: ClickUpConnectionStatus = {
      connected: true,
      clickupUserId: conn.clickupUserId,
      clickupUserEmail: conn.clickupUserEmail,
      connectedAt: conn.connectedAt.toISOString(),
      lastSyncAt: conn.lastSyncAt ? conn.lastSyncAt.toISOString() : null,
      lastError: conn.lastError,
    };
    return status;
  },

  async disconnect(actor: SessionUser): Promise<{ disconnected: boolean }> {
    const existing = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: { id: true, isActive: true },
    });
    if (!existing || !existing.isActive) return { disconnected: false };

    await prisma.clickUpConnection.update({
      where: { userId: actor.userId },
      data: { isActive: false, revokedAt: new Date() },
    });
    return { disconnected: true };
  },
};
