import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const localTasks = await prisma.task.findMany({
    where: { source: "LOCAL" },
    select: {
      id: true,
      title: true,
      isArchived: true,
      _count: { select: { timeEntries: true } },
    },
  });

  if (localTasks.length === 0) {
    console.log("No LOCAL tasks found. Nothing to do.");
    return;
  }

  let deleted = 0;
  let archived = 0;
  let alreadyArchived = 0;

  for (const t of localTasks) {
    if (t._count.timeEntries === 0) {
      await prisma.task.delete({ where: { id: t.id } });
      deleted++;
      console.log(`  deleted: ${t.id} "${t.title}"`);
      continue;
    }

    if (t.isArchived) {
      alreadyArchived++;
      continue;
    }

    await prisma.task.update({
      where: { id: t.id },
      data: { isArchived: true },
    });
    archived++;
    console.log(
      `  archived: ${t.id} "${t.title}" (${t._count.timeEntries} entries)`,
    );
  }

  console.log("");
  console.log(
    `Done: ${deleted} deleted, ${archived} archived, ${alreadyArchived} already archived (skipped).`,
  );
}

main()
  .catch((err) => {
    console.error("Failed to clean up local tasks:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
