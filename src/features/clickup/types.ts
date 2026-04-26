export type ClickUpConnectionStatus =
  | { connected: false }
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
