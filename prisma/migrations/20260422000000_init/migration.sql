-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('LOCAL', 'CLICKUP', 'CLICKUP_INITIAL_SYNC');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('NOT_SYNCED', 'PENDING', 'SYNCED', 'FAILED', 'PERMANENT_FAIL', 'CONFLICT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "clickupUserId" INTEGER,
    "clickupEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "source" "EntrySource" NOT NULL DEFAULT 'LOCAL',
    "clickupTaskId" TEXT,
    "clickupWorkspaceId" TEXT,
    "clickupSpaceId" TEXT,
    "clickupSpaceName" TEXT,
    "clickupFolderId" TEXT,
    "clickupFolderName" TEXT,
    "clickupListId" TEXT,
    "clickupListName" TEXT,
    "clickupUrl" TEXT,
    "clickupStatus" TEXT,
    "clickupStatusColor" TEXT,
    "clickupPriority" INTEGER,
    "clickupDueDate" TIMESTAMP(3),
    "clickupTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clickupCustomFields" JSONB,
    "clickupLastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "note" TEXT,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3),
    "durationSeconds" INTEGER,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "source" "EntrySource" NOT NULL DEFAULT 'LOCAL',
    "clickupTimeEntryId" TEXT,
    "clickupTeamId" TEXT,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'NOT_SYNCED',
    "syncLastAttemptAt" TIMESTAMP(3),
    "syncLastError" TEXT,
    "syncRetryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickUpConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "clickupUserId" INTEGER NOT NULL,
    "clickupUserEmail" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "revokedAt" TIMESTAMP(3),
    "rateLimitRemaining" INTEGER,
    "rateLimitResetAt" TIMESTAMP(3),
    "lastRequestAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickUpConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickUpWorkspace" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "clickupTeamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "avatar" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT true,
    "lastFullSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickUpWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickUpWebhook" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "clickupWebhookId" TEXT NOT NULL,
    "clickupTeamId" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "secretIv" TEXT NOT NULL,
    "events" TEXT[],
    "endpoint" TEXT NOT NULL,
    "isHealthy" BOOLEAN NOT NULL DEFAULT true,
    "lastFailedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickUpWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickUpWebhookEvent" (
    "id" TEXT NOT NULL,
    "clickupEventId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickUpWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_clickupUserId_key" ON "User"("clickupUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_clickupTaskId_key" ON "Task"("clickupTaskId");

-- CreateIndex
CREATE INDEX "Task_isArchived_status_idx" ON "Task"("isArchived", "status");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Task_clickupTaskId_idx" ON "Task"("clickupTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_clickupTimeEntryId_key" ON "TimeEntry"("clickupTimeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntry_userId_startTime_idx" ON "TimeEntry"("userId", "startTime");

-- CreateIndex
CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TimeEntry_syncStatus_idx" ON "TimeEntry"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ClickUpConnection_userId_key" ON "ClickUpConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickUpWorkspace_connectionId_clickupTeamId_key" ON "ClickUpWorkspace"("connectionId", "clickupTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickUpWebhook_clickupWebhookId_key" ON "ClickUpWebhook"("clickupWebhookId");

-- CreateIndex
CREATE UNIQUE INDEX "ClickUpWebhookEvent_clickupEventId_key" ON "ClickUpWebhookEvent"("clickupEventId");

-- CreateIndex
CREATE INDEX "ClickUpWebhookEvent_processedAt_idx" ON "ClickUpWebhookEvent"("processedAt");

-- CreateIndex
CREATE INDEX "ClickUpWebhookEvent_receivedAt_idx" ON "ClickUpWebhookEvent"("receivedAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickUpConnection" ADD CONSTRAINT "ClickUpConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickUpWorkspace" ADD CONSTRAINT "ClickUpWorkspace_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ClickUpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClickUpWebhook" ADD CONSTRAINT "ClickUpWebhook_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ClickUpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateIndex: prevent duplicate running timers per user (Part 6 timer atomicity)
CREATE UNIQUE INDEX "unique_running_timer_per_user"
  ON "TimeEntry"("userId")
  WHERE "endTime" IS NULL;
