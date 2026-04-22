// Background worker entry point.
// V1: starts pg-boss and logs "Worker ready". V2 will register handlers for
// ClickUp sync jobs here.

import "dotenv/config";
import { getBoss, stopBoss } from "./lib/jobs/queue";

async function main() {
  const boss = await getBoss();
  console.log("[worker] Worker ready — pg-boss connected");

  // V2: register handlers via boss.work(JOB_NAMES.CLICKUP_INITIAL_SYNC, ...)
  void boss;

  const shutdown = async (signal: string) => {
    console.log(`[worker] received ${signal}, shutting down…`);
    try {
      await stopBoss();
      process.exit(0);
    } catch (err) {
      console.error("[worker] shutdown error:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[worker] fatal error on startup:", err);
  process.exit(1);
});
