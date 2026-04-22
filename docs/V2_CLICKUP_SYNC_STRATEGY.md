# V2 — ClickUp Sync Strategy

This document is the contract for the upcoming ClickUp integration (V2). None of it is implemented in V1, but the schema fields, encryption utilities, and pg-boss worker that make it cheap to build are already in place.

The central risk in any two-way sync is **feedback loops**: we push a time entry to ClickUp, ClickUp fires a webhook telling us a time entry was created, we treat that as a new entry and push it back, and so on. The five mechanisms below collectively prevent that.

---

## 1. Origin tracking

Every `TimeEntry` carries a `source` column:

| Value                  | Meaning                                     |
| ---------------------- | ------------------------------------------- |
| `LOCAL`                | Created in our app (timer or manual entry). |
| `CLICKUP`              | Received via webhook from ClickUp.          |
| `CLICKUP_INITIAL_SYNC` | Pulled during the first workspace sync.    |

**Rule:** entries with `source IN (CLICKUP, CLICKUP_INITIAL_SYNC)` are **never** enqueued for push. The push enqueuer must check `source = LOCAL` before calling `boss.send(JOB_NAMES.CLICKUP_PUSH_TIME_ENTRY, ...)`.

This is the first line of defence. Even if every other check below fails, origin tracking alone breaks the loop.

---

## 2. Echo prevention

When we push a local entry, ClickUp responds with its own `time_entry_id`. We store it in `TimeEntry.clickupTimeEntryId`.

Seconds later, ClickUp fires a `timeTrackedCreated` webhook for the entry we just created. The handler **must** look up any existing local row by `clickupTimeEntryId` before creating a new one:

```ts
const existing = await prisma.timeEntry.findUnique({
  where: { clickupTimeEntryId: payload.historyItems[0].id },
});
if (existing) return; // our own echo
```

This also keeps the system correct if ClickUp ever replays an old webhook.

---

## 3. Race-window cache

Between the HTTP response from `POST /time_entries` and the `clickupTimeEntryId` being committed to Postgres, there is a window (often <1s) where the webhook could fire and the database lookup in §2 would miss.

Bridge it with a 10-second in-memory `Map<string, number>` keyed by `clickupTimeEntryId`, populated the moment we get the response from ClickUp:

```ts
recentPushCache.set(clickupTimeEntryId, Date.now());
// cleanup: entries older than 10s are pruned on each insert
```

Webhook handler: check the cache **before** the database. If the ID is in the cache, skip processing — it's our own echo, still in flight to the database.

This is a per-process cache; in a multi-worker deployment each worker gets its own, which is fine because the only downside of a cache miss is falling through to the §2 database check, which catches it.

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
  if (err.code === "P2002") return; // duplicate — already handled
  throw err;
}
// Only reached on first insert. Now enqueue the sync job.
await boss.send(JOB_NAMES.CLICKUP_PROCESS_WEBHOOK, { eventId });
```

The unique constraint is the single source of truth — no ambiguous "have we processed this?" lookups.

---

## 5. Rate limits

ClickUp allows 100 requests/minute per token. `ClickUpConnection` tracks `rateLimitRemaining`, `rateLimitResetAt`, `lastRequestAt`, updated from each response's headers.

Rules for every outbound ClickUp call:

1. **Pre-flight check**: if `rateLimitRemaining < 10`, delay the job until `rateLimitResetAt` (requeue with `startAfter`).
2. **Respect 429 Retry-After**: on 429, honour the header exactly, reset `rateLimitRemaining = 0`, bump `syncRetryCount`.
3. **Initial sync cap**: the `clickup.initial-sync` job throttles itself to **80 req/min**, reserving 20 req/min for interactive user actions (pushing a just-stopped timer must not wait behind a bulk backfill).

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

- `FAILED` entries are retried with exponential backoff by the worker (baseline `boss.send({ retryLimit: 5, retryBackoff: true })`).
- `PERMANENT_FAIL` is terminal; the UI surfaces a re-connect or re-assign action.
- `CONFLICT` freezes the entry and requires user input. We never clobber remote changes silently.

---

## What V1 already ships to make this easy

| Piece                                  | V1 file                            |
| -------------------------------------- | ---------------------------------- |
| AES-256-GCM for OAuth tokens           | `src/lib/encryption.ts`            |
| pg-boss worker process                 | `src/worker.ts`                    |
| Job name constants                     | `src/lib/jobs/queue.ts`            |
| `source`, `syncStatus`, retry counters | `prisma/schema.prisma` (TimeEntry) |
| `clickupTimeEntryId @unique`           | `prisma/schema.prisma`             |
| `clickupEventId @unique` (webhook dedup) | `prisma/schema.prisma`           |
| `ClickUpConnection.rateLimit*` fields  | `prisma/schema.prisma`             |
| Service signature hook                 | `TimeEntryService.create(data, options?: { syncToClickUp?: boolean })` — param accepted but ignored in V1 |

V2 is additive: new route handlers (OAuth callback, webhook receiver), new service methods, new `boss.work(...)` handlers. No schema migrations, no refactors.
