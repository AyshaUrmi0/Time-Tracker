export type TaskUser = { id: string; name: string; email: string };

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  isArchived: boolean;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: TaskUser;
  assignedTo: TaskUser | null;
  clickupTaskId: string | null;
  clickupUrl: string | null;
  clickupLastSyncedAt: string | null;
  clickupStatus: string | null;
  clickupStatusColor: string | null;
  clickupPriority: number | null;
  clickupDueDate: string | null;
  clickupTags: string[];
  clickupSpaceName: string | null;
  clickupFolderName: string | null;
  clickupListName: string | null;
};

export type TaskListFilters = {
  status?: TaskStatus;
  assignedToId?: string | "unassigned";
  archived: "true" | "false" | "all";
};
