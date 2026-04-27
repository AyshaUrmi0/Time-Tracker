export type ClickUpConnectionStatus =
  | { connected: false; lastError?: string | null }
  | {
      connected: true;
      clickupUserId: number;
      clickupUserEmail: string;
      connectedAt: string;
      lastSyncAt: string | null;
      lastError: string | null;
    };

export type ClickUpUser = {
  id: number;
  username: string;
  email: string;
  color: string | null;
  profilePicture: string | null;
};

export type ClickUpSyncResult = {
  teamsScanned: number;
  listsScanned: number;
  tasksImported: number;
  tasksUpdated: number;
  errors: string[];
  startedAt: string;
  finishedAt: string;
};

export type ClickUpWebhookRegisterResult = {
  endpoint: string;
  events: string[];
  webhooks: Array<{
    teamId: string;
    teamName: string;
    webhookId: string | null;
    events: string[];
    endpoint: string;
    alreadyRegistered: boolean;
    error?: string;
  }>;
};

export type ClickUpWebhookUnregisterResult = {
  removed: number;
  failures: Array<{ webhookId: string; error: string }>;
};

export type ClickUpWebhookHealthResult = {
  webhooks: Array<{
    webhookId: string;
    teamId: string;
    isHealthy: boolean;
    failureCount: number;
    lastFailedAt: string | null;
    registeredAt: string;
  }>;
};

export type ClickUpMembersSyncResult = {
  teamsScanned: number;
  membersFound: number;
  linked: number;
  alreadyLinked: number;
  unmatchedEmails: string[];
  conflicts: Array<{ email: string; clickupUserId: number; reason: string }>;
};

export type ClickUpTimeEntriesPullResult = {
  teamsScanned: number;
  entriesScanned: number;
  imported: number;
  updated: number;
  deletedLocally: number;
  skippedAlreadyLocal: number;
  skippedNoTask: number;
  skippedNoUser: number;
  skippedNoDuration: number;
  windowDays: number;
  errors: string[];
};

export type ClickUpWebhookProcessResult =
  | { ok: false; skipped: string }
  | {
      ok: true;
      eventId?: string;
      action?: string;
      detail?: string;
      deduped?: boolean;
    };
