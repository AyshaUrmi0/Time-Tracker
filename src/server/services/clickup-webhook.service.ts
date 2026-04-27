import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiErrors } from "@/lib/api-error";
import { decrypt, encrypt } from "@/lib/encryption";
import {
  createClickUpWebhookOnClickUp,
  deleteClickUpWebhookOnClickUp,
  fetchClickUpTaskDetail,
  fetchClickUpTeams,
} from "@/lib/clickup/client";
import { upsertSingleTaskFromClickUp } from "@/server/services/clickup-sync.service";
import { handleClickUpInvalidToken } from "@/server/services/clickup-error-handling";
import type {
  ClickUpWebhookHealthResult,
  ClickUpWebhookProcessResult,
  ClickUpWebhookRegisterResult,
  ClickUpWebhookUnregisterResult,
} from "@/features/clickup/types";
import type { SessionUser } from "@/types";

const DEFAULT_EVENTS = [
  "taskCreated",
  "taskUpdated",
  "taskDeleted",
  "taskStatusUpdated",
  "taskAssigneeUpdated",
  "taskMoved",
  "taskPriorityUpdated",
  "taskTagUpdated",
];

type WebhookPayload = {
  event?: string;
  task_id?: string;
  webhook_id?: string;
  team_id?: string;
  history_items?: Array<{ id?: string }>;
};

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function deriveEventId(
  webhookId: string,
  payload: WebhookPayload,
  rawBody: string,
): string {
  const historyId = payload.history_items?.[0]?.id;
  if (historyId) return `${webhookId}:${historyId}`;
  const hash = createHash("sha256").update(rawBody).digest("hex").slice(0, 24);
  return `${webhookId}:body:${hash}`;
}

async function handleEvent(
  connectionUserId: string,
  encryptedToken: string,
  iv: string,
  payload: WebhookPayload,
): Promise<{ action: string; detail?: string }> {
  const eventType = payload.event ?? "unknown";
  const taskId = payload.task_id;
  if (!taskId) return { action: "skipped", detail: "no_task_id" };

  if (eventType === "taskDeleted") {
    const updated = await prisma.task.updateMany({
      where: { clickupTaskId: taskId },
      data: { isArchived: true },
    });
    return { action: "archived", detail: `count=${updated.count}` };
  }

  const token = decrypt(encryptedToken, iv);
  const detail = await fetchClickUpTaskDetail(token, taskId);
  if (!detail) return { action: "skipped", detail: "task_not_found_remote" };

  const result = await upsertSingleTaskFromClickUp(detail, connectionUserId);
  if (result.status === "skipped") {
    return { action: "skipped", detail: result.reason };
  }
  return { action: result.status };
}

export const clickupWebhookService = {
  async getHealth(actor: SessionUser): Promise<ClickUpWebhookHealthResult> {
    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: {
        id: true,
        webhooks: {
          select: {
            clickupWebhookId: true,
            clickupTeamId: true,
            isHealthy: true,
            failureCount: true,
            lastFailedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!conn) return { webhooks: [] };
    return {
      webhooks: conn.webhooks.map((w) => ({
        webhookId: w.clickupWebhookId,
        teamId: w.clickupTeamId,
        isHealthy: w.isHealthy,
        failureCount: w.failureCount,
        lastFailedAt: w.lastFailedAt ? w.lastFailedAt.toISOString() : null,
        registeredAt: w.createdAt.toISOString(),
      })),
    };
  },

  async register(
    actor: SessionUser,
    endpoint: string,
  ): Promise<ClickUpWebhookRegisterResult> {
    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: {
        id: true,
        accessTokenEncrypted: true,
        encryptionIv: true,
        isActive: true,
      },
    });
    if (!conn || !conn.isActive) {
      throw ApiErrors.conflict(
        "CLICKUP_NOT_CONNECTED",
        "Connect ClickUp first.",
      );
    }

    const token = decrypt(conn.accessTokenEncrypted, conn.encryptionIv);
    let teams;
    try {
      teams = await fetchClickUpTeams(token);
    } catch (err) {
      await handleClickUpInvalidToken(err, actor.userId);
      throw err;
    }

    const results: ClickUpWebhookRegisterResult["webhooks"] = [];
    for (const team of teams) {
      const existing = await prisma.clickUpWebhook.findFirst({
        where: { connectionId: conn.id, clickupTeamId: team.id },
        select: { clickupWebhookId: true, events: true, endpoint: true },
      });
      if (existing) {
        results.push({
          teamId: team.id,
          teamName: team.name,
          webhookId: existing.clickupWebhookId,
          events: existing.events,
          endpoint: existing.endpoint,
          alreadyRegistered: true,
        });
        continue;
      }

      try {
        const created = await createClickUpWebhookOnClickUp(token, team.id, {
          endpoint,
          events: DEFAULT_EVENTS,
        });
        const { encrypted: secretEncrypted, iv: secretIv } = encrypt(
          created.secret,
        );
        await prisma.clickUpWebhook.create({
          data: {
            connectionId: conn.id,
            clickupWebhookId: created.id,
            clickupTeamId: team.id,
            secretEncrypted,
            secretIv,
            events: DEFAULT_EVENTS,
            endpoint,
          },
        });
        results.push({
          teamId: team.id,
          teamName: team.name,
          webhookId: created.id,
          events: DEFAULT_EVENTS,
          endpoint,
          alreadyRegistered: false,
        });
      } catch (err) {
        results.push({
          teamId: team.id,
          teamName: team.name,
          webhookId: null,
          events: DEFAULT_EVENTS,
          endpoint,
          alreadyRegistered: false,
          error: (err as Error).message?.slice(0, 200) ?? "register failed",
        });
      }
    }

    return {
      endpoint,
      events: DEFAULT_EVENTS,
      webhooks: results,
    };
  },

  async unregister(
    actor: SessionUser,
  ): Promise<ClickUpWebhookUnregisterResult> {
    const conn = await prisma.clickUpConnection.findUnique({
      where: { userId: actor.userId },
      select: {
        id: true,
        accessTokenEncrypted: true,
        encryptionIv: true,
        isActive: true,
        webhooks: {
          select: { id: true, clickupWebhookId: true, clickupTeamId: true },
        },
      },
    });
    if (!conn) return { removed: 0, failures: [] };

    const failures: ClickUpWebhookUnregisterResult["failures"] = [];
    let removed = 0;

    if (conn.webhooks.length === 0) return { removed, failures };

    const token = conn.isActive
      ? decrypt(conn.accessTokenEncrypted, conn.encryptionIv)
      : null;

    for (const wh of conn.webhooks) {
      if (token) {
        try {
          await deleteClickUpWebhookOnClickUp(token, wh.clickupWebhookId);
        } catch (err) {
          failures.push({
            webhookId: wh.clickupWebhookId,
            error: (err as Error).message?.slice(0, 200) ?? "delete failed",
          });
          await handleClickUpInvalidToken(err, actor.userId);
        }
      }
      await prisma.clickUpWebhook.delete({ where: { id: wh.id } });
      removed++;
    }

    return { removed, failures };
  },

  async processIncoming(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<ClickUpWebhookProcessResult> {
    console.log(
      `[clickup-webhook] received: bodyLen=${rawBody.length}, hasSig=${signatureHeader !== null}, bodyPreview=${rawBody.slice(0, 200)}`,
    );

    if (!signatureHeader) {
      return { ok: false, skipped: "missing_signature" };
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      console.log("[clickup-webhook] skipped: invalid_json");
      return { ok: false, skipped: "invalid_json" };
    }

    const webhookId = payload.webhook_id;
    if (!webhookId) {
      console.log("[clickup-webhook] skipped: missing_webhook_id");
      return { ok: false, skipped: "missing_webhook_id" };
    }

    const wh = await prisma.clickUpWebhook.findUnique({
      where: { clickupWebhookId: webhookId },
      select: {
        id: true,
        secretEncrypted: true,
        secretIv: true,
        clickupTeamId: true,
        connection: {
          select: {
            userId: true,
            accessTokenEncrypted: true,
            encryptionIv: true,
            isActive: true,
          },
        },
      },
    });
    if (!wh) {
      console.log(
        `[clickup-webhook] skipped: unknown_webhook id=${webhookId}`,
      );
      return { ok: false, skipped: "unknown_webhook" };
    }

    const secret = decrypt(wh.secretEncrypted, wh.secretIv);
    const computed = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const sigNorm = signatureHeader.trim().toLowerCase();
    if (!safeEqualHex(computed, sigNorm)) {
      console.log(
        `[clickup-webhook] skipped: bad_signature webhookId=${webhookId} sigGotPreview=${sigNorm.slice(0, 16)} sigExpectedPreview=${computed.slice(0, 16)}`,
      );
      return { ok: false, skipped: "bad_signature" };
    }
    console.log(
      `[clickup-webhook] verified: webhookId=${webhookId} event=${payload.event} taskId=${payload.task_id}`,
    );

    const eventId = deriveEventId(webhookId, payload, rawBody);

    let recordId: string | null = null;
    try {
      const created = await prisma.clickUpWebhookEvent.create({
        data: {
          clickupEventId: eventId,
          webhookId: wh.id,
          event: payload.event ?? "unknown",
          payload: payload as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      recordId = created.id;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { ok: true, deduped: true, eventId };
      }
      throw err;
    }

    if (!wh.connection.isActive) {
      await prisma.clickUpWebhookEvent.update({
        where: { id: recordId },
        data: { errorMessage: "connection_inactive" },
      });
      return { ok: true, eventId, action: "skipped", detail: "connection_inactive" };
    }

    try {
      const outcome = await handleEvent(
        wh.connection.userId,
        wh.connection.accessTokenEncrypted,
        wh.connection.encryptionIv,
        payload,
      );
      await prisma.clickUpWebhookEvent.update({
        where: { id: recordId },
        data: { processedAt: new Date() },
      });
      await prisma.clickUpWebhook.update({
        where: { id: wh.id },
        data: { isHealthy: true, failureCount: 0, lastFailedAt: null },
      });
      return {
        ok: true,
        eventId,
        action: outcome.action,
        detail: outcome.detail,
      };
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 200) ?? "process failed";
      await handleClickUpInvalidToken(err, wh.connection.userId);
      await prisma.clickUpWebhookEvent.update({
        where: { id: recordId },
        data: { errorMessage: msg },
      });
      await prisma.clickUpWebhook.update({
        where: { id: wh.id },
        data: {
          isHealthy: false,
          lastFailedAt: new Date(),
          failureCount: { increment: 1 },
        },
      });
      console.error(`[clickup-webhook] event ${eventId}: ${msg}`);
      return { ok: true, eventId, action: "errored", detail: msg };
    }
  },
};
