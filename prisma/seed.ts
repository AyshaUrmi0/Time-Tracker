import "dotenv/config";
import { PrismaClient, Role, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "../src/lib/constants";

const prisma = new PrismaClient();

const USERS = [
  { id: "seed-admin", email: "admin@test.com", name: "Admin",  password: "Admin123!", role: Role.ADMIN,  timezone: "Asia/Dhaka" },
  { id: "seed-alice", email: "alice@test.com", name: "Alice",  password: "Alice123!", role: Role.MEMBER, timezone: "Asia/Dhaka" },
  { id: "seed-bob",   email: "bob@test.com",   name: "Bob",    password: "Bob123!",   role: Role.MEMBER, timezone: "UTC" },
];

const TASKS = [
  { id: "seed-task-1", title: "Design landing page",     status: TaskStatus.IN_PROGRESS, assignee: "seed-alice" },
  { id: "seed-task-2", title: "Fix login bug",           status: TaskStatus.TODO,        assignee: "seed-bob" },
  { id: "seed-task-3", title: "Write API documentation", status: TaskStatus.TODO,        assignee: null },
  { id: "seed-task-4", title: "Review PR #42",           status: TaskStatus.DONE,        assignee: "seed-alice" },
  { id: "seed-task-5", title: "Database optimization",   status: TaskStatus.IN_PROGRESS, assignee: "seed-bob" },
  { id: "seed-task-6", title: "Team standup notes",      status: TaskStatus.TODO,        assignee: null },
  { id: "seed-task-7", title: "Client meeting prep",     status: TaskStatus.TODO,        assignee: "seed-alice" },
  { id: "seed-task-8", title: "Code refactoring",        status: TaskStatus.IN_PROGRESS, assignee: "seed-bob" },
];

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

type SeedEntry = {
  id: string;
  userId: string;
  taskId: string;
  startOffsetMs: number;
  durationMs: number | null;
  note?: string;
};

function buildEntries(): SeedEntry[] {
  return [
    { id: "seed-entry-alice-today-1",  userId: "seed-alice", taskId: "seed-task-1", startOffsetMs:  -9 * HOUR,                 durationMs: 45 * MIN,             note: "Hero layout exploration" },
    { id: "seed-entry-alice-today-2",  userId: "seed-alice", taskId: "seed-task-7", startOffsetMs:  -5 * HOUR,                 durationMs: 90 * MIN,             note: "Deck outline for Tuesday call" },
    { id: "seed-entry-alice-running",  userId: "seed-alice", taskId: "seed-task-1", startOffsetMs:  -35 * MIN,                 durationMs: null },
    { id: "seed-entry-bob-today-1",    userId: "seed-bob",   taskId: "seed-task-2", startOffsetMs:  -6 * HOUR,                 durationMs: 75 * MIN,             note: "Repro'd the 401 loop on stale tokens" },
    { id: "seed-entry-bob-today-2",    userId: "seed-bob",   taskId: "seed-task-5", startOffsetMs:  -3 * HOUR,                 durationMs: 2 * HOUR + 10 * MIN },
    { id: "seed-entry-alice-d1-1",     userId: "seed-alice", taskId: "seed-task-1", startOffsetMs:  -1 * DAY -  2 * HOUR,      durationMs: 3 * HOUR },
    { id: "seed-entry-alice-d1-2",     userId: "seed-alice", taskId: "seed-task-4", startOffsetMs:  -1 * DAY -  6 * HOUR,      durationMs: 25 * MIN,             note: "Left three comments" },
    { id: "seed-entry-bob-d1-1",       userId: "seed-bob",   taskId: "seed-task-8", startOffsetMs:  -1 * DAY -  4 * HOUR,      durationMs: 2 * HOUR + 15 * MIN },
    { id: "seed-entry-bob-d1-2",       userId: "seed-bob",   taskId: "seed-task-5", startOffsetMs:  -1 * DAY -  8 * HOUR,      durationMs: 55 * MIN },
    { id: "seed-entry-alice-d2-1",     userId: "seed-alice", taskId: "seed-task-7", startOffsetMs:  -2 * DAY -  3 * HOUR,      durationMs: 1 * HOUR + 5 * MIN },
    { id: "seed-entry-alice-d2-2",     userId: "seed-alice", taskId: "seed-task-1", startOffsetMs:  -2 * DAY -  7 * HOUR,      durationMs: 2 * HOUR },
    { id: "seed-entry-bob-d2-1",       userId: "seed-bob",   taskId: "seed-task-2", startOffsetMs:  -2 * DAY -  5 * HOUR,      durationMs: 40 * MIN,             note: "Session-token edge case" },
    { id: "seed-entry-bob-d2-2",       userId: "seed-bob",   taskId: "seed-task-8", startOffsetMs:  -2 * DAY -  9 * HOUR,      durationMs: 1 * HOUR + 30 * MIN },
    { id: "seed-entry-alice-d3-1",     userId: "seed-alice", taskId: "seed-task-4", startOffsetMs:  -3 * DAY -  4 * HOUR,      durationMs: 15 * MIN },
    { id: "seed-entry-alice-d3-2",     userId: "seed-alice", taskId: "seed-task-1", startOffsetMs:  -3 * DAY -  8 * HOUR,      durationMs: 2 * HOUR + 45 * MIN,  note: "Paired with Priya on the nav" },
    { id: "seed-entry-bob-d3-1",       userId: "seed-bob",   taskId: "seed-task-5", startOffsetMs:  -3 * DAY -  5 * HOUR,      durationMs: 1 * HOUR + 40 * MIN },
    { id: "seed-entry-alice-d4-1",     userId: "seed-alice", taskId: "seed-task-1", startOffsetMs:  -4 * DAY -  6 * HOUR,      durationMs: 50 * MIN },
    { id: "seed-entry-bob-d5-1",       userId: "seed-bob",   taskId: "seed-task-2", startOffsetMs:  -5 * DAY -  3 * HOUR,      durationMs: 1 * HOUR + 20 * MIN },
    { id: "seed-entry-alice-d6-1",     userId: "seed-alice", taskId: "seed-task-7", startOffsetMs:  -6 * DAY -  4 * HOUR,      durationMs: 35 * MIN },
    { id: "seed-entry-bob-d6-1",       userId: "seed-bob",   taskId: "seed-task-8", startOffsetMs:  -6 * DAY -  7 * HOUR,      durationMs: 2 * HOUR + 5 * MIN,   note: "Extracted the timer hook" },
  ];
}

async function seedUsers() {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        passwordHash,
        role: u.role,
        timezone: u.timezone,
      },
      update: {
        name: u.name,
        role: u.role,
        timezone: u.timezone,
        passwordHash,
        isArchived: false,
      },
    });
  }
  console.log(`[seed] users: ${USERS.length}`);
}

async function seedTasks() {
  for (const t of TASKS) {
    await prisma.task.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        title: t.title,
        status: t.status,
        createdById: "seed-admin",
        assignedToId: t.assignee ?? null,
      },
      update: {
        title: t.title,
        status: t.status,
        assignedToId: t.assignee ?? null,
        isArchived: false,
      },
    });
  }
  console.log(`[seed] tasks: ${TASKS.length}`);
}

async function seedEntries() {
  await prisma.timeEntry.deleteMany({
    where: { userId: { in: ["seed-alice", "seed-bob"] } },
  });

  const now = Date.now();
  const entries = buildEntries();

  for (const e of entries) {
    const startTime = new Date(now + e.startOffsetMs);
    const endTime = e.durationMs === null ? null : new Date(startTime.getTime() + e.durationMs);
    const durationSeconds = e.durationMs === null ? null : Math.floor(e.durationMs / 1000);

    await prisma.timeEntry.create({
      data: {
        id: e.id,
        userId: e.userId,
        taskId: e.taskId,
        note: e.note,
        startTime,
        endTime,
        durationSeconds,
      },
    });
  }

  console.log(`[seed] time entries: ${entries.length} (1 running for alice)`);
}

async function main() {
  console.log("[seed] starting");
  await seedUsers();
  await seedTasks();
  await seedEntries();
  console.log("[seed] done");
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
