// Database seed — idempotent (uses upsert).
// Project-setup ships a skeleton that validates the seed pipeline runs.
// Feature/auth-api will populate admin/alice/bob and their tasks + entries.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] starting — project-setup skeleton");

  // Real seed data is added in feature/auth-api (Users, Tasks, TimeEntries).
  // We keep this file runnable now so `pnpm db:seed` exits 0 against a
  // freshly migrated database, which simplifies CI and contributor setup.

  const userCount = await prisma.user.count();
  const taskCount = await prisma.task.count();
  const entryCount = await prisma.timeEntry.count();

  console.log(
    `[seed] current row counts — users=${userCount} tasks=${taskCount} entries=${entryCount}`,
  );
  console.log("[seed] skeleton run complete. Real seed lands in feature/auth-api.");
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
