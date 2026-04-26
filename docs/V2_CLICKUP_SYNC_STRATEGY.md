# V2 — ClickUp Sync Strategy

This document is the contract for the upcoming ClickUp integration (V2). None of it is implemented in V1, but the schema fields and encryption utilities that make it cheap to build are already in place.

V2 runs **entirely on Vercel-native primitives** — serverless route handlers + Vercel Cron Jobs. There is no separate worker process. This keeps the deployment to a single Vercel project on the free Hobby plan.

The central risk in any two-way sync is **feedback loops**: we push a time entry to ClickUp, ClickUp fires a webhook telling us a time entry was created, we treat that as a new entry and push it back, and so on. The five mechanisms below collectively prevent that.

---

## Execution model (Vercel-native)

| Concern | V2 mechanism |
| --- | --- |
| OAuth token refresh | **Vercel Cron Job** (`/api/cron/refresh-clickup-tokens`) every 30 min — refreshes connections nearing expiry |
| Webhook ingestion | **API route** `/api/clickup/webhooks/[connectionId]` — verifies signature, dedups, processes inline (small payloads, finishes in <1s) |
| Push time entry on stop | Inline in the `stopTimer` route handler — single HTTP call to ClickUp, fits in the 10s function budget |
| Initial workspace sync | **API route** `/api/clickup/sync` triggered after OAuth — chunks work into self-continuing requests when a single function would exceed 10s, or invoked repeatedly by a "drain pending sync" cron |
| Drain pending pushes | **Vercel Cron Job** every 5 min — picks up `TimeEntry` rows where `syncStatus = PENDING` and retries (handles transient failures, retry queue) |

This replaces the pg-boss queue with two things: synchronous inline calls for fast paths, and Vercel Cron Jobs for periodic drains. Failures are tracked in `TimeEntry.syncStatus` + `syncRetryCount` columns; the cron drainer is the retry mechanism.

Trade-offs vs. a dedicated worker:
- **Lost:** sub-second job dispatch latency. The cron drainer processes failed pushes within ~5 min, not seconds.
- **Lost:** the `LISTEN/NOTIFY` real-time job pickup pattern.
- **Gained:** zero infra to provision; everything is a Vercel route handler.
- **Gained:** the same code runs in dev as in prod (no `npm run worker` needed).

---

## 1. Origin tracking

Every `TimeEntry` carries a `source` column:

| Value                  | Meaning                                     |
| ---------------------- | ------------------------------------------- |
| `LOCAL`                | Created in our app (timer or manual entry). |
| `CLICKUP`              | Received via webhook from ClickUp.          |
| `CLICKUP_INITIAL_SYNC` | Pulled during the first workspace sync.    |

**Rule:** entries with `source IN (CLICKUP, CLICKUP_INITIAL_SYNC)` are **never** pushed to ClickUp. The push helper checks `source = LOCAL` before issuing the outbound call.

This is the first line of defence. Even if every other check below fails, origin tracking alone breaks the loop.

---

## 2. Echo prevention

When we push a local entry, ClickUp responds with its own `time_entry_id`. We store it in `TimeEntry.clickupTimeEntryId`.

Seconds later, ClickUp fires a `timeTrackedCreated` webhook for the entry we just created. The webhook handler **must** look up any existing local row by `clickupTimeEntryId` before creating a new one:

```ts
const existing = await prisma.timeEntry.findUnique({
  where: { clickupTimeEntryId: payload.historyItems[0].id },
});
if (existing) return;
```

This also keeps the system correct if ClickUp ever replays an old webhook.

---

## 3. Race-window cache

Between the HTTP response from `POST /time_entries` and the `clickupTimeEntryId` being committed to Postgres, there is a window (often <1s) where the webhook could fire and the database lookup in §2 would miss.

Bridge it with a 10-second in-memory `Map<string, number>` keyed by `clickupTimeEntryId`, populated the moment we get the response from ClickUp:

```ts
recentPushCache.set(clickupTimeEntryId, Date.now());
```

Webhook handler: check the cache **before** the database. If the ID is in the cache, skip processing — it's our own echo, still in flight to the database.

⚠️ **Vercel caveat:** serverless functions are stateless across invocations. The cache only protects within a single warm function instance. In practice, Vercel keeps a function warm for a few minutes after invocation and routes follow-up requests to the same instance, so the 10s window is usually covered. The §2 database check is the durable fallback when it isn't.

---

## 4. Webhook deduplication

ClickUp webhooks can be retried. Every payload carries a unique event identifier.

Schema enforces this at the storage layer: `ClickUpWebhookEvent.clickupEventId` has `@unique`. The webhook endpoint uses an **insert-first** pattern:

```ts
try {
  await prisma.clickUpWebhookEvent.create({
    data: { clickupEventId, webhookId, event, payload, receivedAt: new Date() },
  });
} catch (err) {
  if (err.code === "P2002") return;
  throw err;
}
await processWebhook(eventId);
```

The unique constraint is the single source of truth — no ambiguous "have we processed this?" lookups.

---

## 5. Rate limits

ClickUp allows 100 requests/minute per token. `ClickUpConnection` tracks `rateLimitRemaining`, `rateLimitResetAt`, `lastRequestAt`, updated from each response's headers.

Rules for every outbound ClickUp call:

1. **Pre-flight check**: if `rateLimitRemaining < 10`, the call returns early without hitting ClickUp; the entry stays at `syncStatus = PENDING` and the next cron drain picks it up after the rate-limit reset.
2. **Respect 429 Retry-After**: on 429, mark the connection's `rateLimitResetAt` to `now + Retry-After`, set `rateLimitRemaining = 0`, bump `syncRetryCount`. The drainer will skip until the reset time passes.
3. **Initial sync cap**: the `/api/clickup/sync` handler throttles itself to **80 req/min**, reserving 20 req/min for interactive user actions (pushing a just-stopped timer must not wait behind a bulk backfill).

Rate-limit state is per-connection, not global — two users syncing simultaneously don't starve each other.

---

## Failure modes & retry policy

`TimeEntry.syncStatus` progresses:

```
NOT_SYNCED ─────────────► PENDING ─────► SYNCED
                             │
                             ├─► FAILED ─(retry ≤5)─► PENDING
                             ├─► PERMANENT_FAIL   (token revoked, task deleted — stop retrying)
                             └─► CONFLICT         (remote mutated after our sync — manual resolve)
```

- `FAILED` entries with `syncRetryCount < 5` are retried by the drain cron (`/api/cron/drain-pending-syncs`) every 5 min, with exponential backoff applied via `nextRetryAt`.
- `PERMANENT_FAIL` is terminal; the UI surfaces a re-connect or re-assign action.
- `CONFLICT` freezes the entry and requires user input. We never clobber remote changes silently.

---

## What V1 already ships to make this easy

| Piece                                    | V1 file                            |
| ---------------------------------------- | ---------------------------------- |
| AES-256-GCM for OAuth tokens             | `src/lib/encryption.ts`            |
| `source`, `syncStatus`, retry counters   | `prisma/schema.prisma` (TimeEntry) |
| `clickupTimeEntryId @unique`             | `prisma/schema.prisma`             |
| `clickupEventId @unique` (webhook dedup) | `prisma/schema.prisma`             |
| `ClickUpConnection.rateLimit*` fields    | `prisma/schema.prisma`             |
| Service signature hook                   | `TimeEntryService.create(data, options?: { syncToClickUp?: boolean })` — param accepted but ignored in V1 |

V2 is additive: new route handlers (OAuth callback, webhook receiver, sync trigger, cron drainers) and new service methods. No schema migrations, no refactors, no new deployment targets.

---

## Vercel Cron config (for V2 reference)

When V2 lands, `vercel.json` will declare two crons (Hobby plan allows 2):

```json
{
  "crons": [
    { "path": "/api/cron/refresh-clickup-tokens", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/drain-pending-syncs",    "schedule": "*/5 * * * *" }
  ]
}
```

Both endpoints check the `Authorization: Bearer ${CRON_SECRET}` header (Vercel sets this automatically) before running.
