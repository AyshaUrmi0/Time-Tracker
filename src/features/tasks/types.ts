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
};

export type TaskListFilters = {
  status?: TaskStatus;
  assignedToId?: string | "unassigned";
  archived: "true" | "false" | "all";
};
