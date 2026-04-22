// Background job queue powered by pg-boss.
// V1 exposes a lazy singleton; no handlers are registered yet. V2 will add
// ClickUp sync job handlers and enqueue calls from services.

import PgBoss from "pg-boss";

let boss: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set; pg-boss requires a Postgres connection string");
  }
  return url;
}

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  if (startPromise) return startPromise;

  startPromise = (async () => {
    const instance = new PgBoss({
      connectionString: getConnectionString(),
      schema: "pgboss",
    });
    instance.on("error", (err) => {
      console.error("[pg-boss] error:", err);
    });
    await instance.start();
    boss = instance;
    return instance;
  })();

  return startPromise;
}

export async function stopBoss(): Promise<void> {
  if (!boss) return;
  await boss.stop({ graceful: true });
  boss = null;
  startPromise = null;
}

// Job name constants — V2 handlers will register against these.
export const JOB_NAMES = {
  CLICKUP_INITIAL_SYNC: "clickup.initial-sync",
  CLICKUP_PUSH_TIME_ENTRY: "clickup.push-time-entry",
  CLICKUP_PROCESS_WEBHOOK: "clickup.process-webhook",
  CLICKUP_REFRESH_TOKEN: "clickup.refresh-token",
} as const;
