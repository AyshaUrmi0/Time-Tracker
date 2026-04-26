import { ApiErrors } from "../api-error";
import type { ClickUpUser } from "@/features/clickup/types";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

type ClickUpFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean>;
  body?: unknown;
};

async function clickupFetch<T>(
  path: string,
  token: string,
  options: ClickUpFetchOptions = {},
): Promise<T> {
  const url = new URL(`${CLICKUP_API_BASE}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, String(v));
    }
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers: { Authorization: token, "Content-Type": "application/json" },
      cache: "no-store",
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw ApiErrors.conflict(
      "CLICKUP_UNREACHABLE",
      "Couldn't reach ClickUp. Check your network and try again.",
      { cause: (err as Error).message },
    );
  }

  if (res.status === 401) {
    throw ApiErrors.conflict(
      "CLICKUP_INVALID_TOKEN",
      "ClickUp rejected the token. Reconnect ClickUp from /settings.",
    );
  }
  if (res.status === 429) {
    throw ApiErrors.conflict(
      "CLICKUP_RATE_LIMITED",
      "ClickUp rate limit hit. Wait a minute and try again.",
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw ApiErrors.conflict(
      "CLICKUP_API_ERROR",
      `ClickUp returned ${res.status} ${res.statusText}`,
      { body: text.slice(0, 500) },
    );
  }
  return (await res.json()) as T;
}

type ClickUpUserResponse = {
  user: {
    id: number;
    username: string;
    email: string;
    color?: string | null;
    profilePicture?: string | null;
  };
};

export async function fetchClickUpUser(token: string): Promise<ClickUpUser> {
  const json = await clickupFetch<ClickUpUserResponse>("/user", token);
  return {
    id: json.user.id,
    username: json.user.username,
    email: json.user.email,
    color: json.user.color ?? null,
    profilePicture: json.user.profilePicture ?? null,
  };
}

export type ClickUpTeam = {
  id: string;
  name: string;
  color: string | null;
  avatar: string | null;
};

type ClickUpTeamsResponse = {
  teams: Array<{
    id: string;
    name: string;
    color?: string | null;
    avatar?: string | null;
  }>;
};

export async function fetchClickUpTeams(token: string): Promise<ClickUpTeam[]> {
  const json = await clickupFetch<ClickUpTeamsResponse>("/team", token);
  return json.teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color ?? null,
    avatar: t.avatar ?? null,
  }));
}

export type ClickUpSpace = { id: string; name: string };

type ClickUpSpacesResponse = {
  spaces: Array<{ id: string; name: string }>;
};

export async function fetchClickUpSpaces(
  token: string,
  teamId: string,
): Promise<ClickUpSpace[]> {
  const json = await clickupFetch<ClickUpSpacesResponse>(
    `/team/${teamId}/space`,
    token,
    { query: { archived: false } },
  );
  return json.spaces.map((s) => ({ id: s.id, name: s.name }));
}

export type ClickUpListMeta = { id: string; name: string };

export type ClickUpFolder = {
  id: string;
  name: string;
  lists: ClickUpListMeta[];
};

type ClickUpFoldersResponse = {
  folders: Array<{
    id: string;
    name: string;
    lists?: Array<{ id: string; name: string }>;
  }>;
};

export async function fetchClickUpFolders(
  token: string,
  spaceId: string,
): Promise<ClickUpFolder[]> {
  const json = await clickupFetch<ClickUpFoldersResponse>(
    `/space/${spaceId}/folder`,
    token,
    { query: { archived: false } },
  );
  return json.folders.map((f) => ({
    id: f.id,
    name: f.name,
    lists: (f.lists ?? []).map((l) => ({ id: l.id, name: l.name })),
  }));
}

type ClickUpListsResponse = {
  lists: Array<{ id: string; name: string }>;
};

export async function fetchClickUpFolderlessLists(
  token: string,
  spaceId: string,
): Promise<ClickUpListMeta[]> {
  const json = await clickupFetch<ClickUpListsResponse>(
    `/space/${spaceId}/list`,
    token,
    { query: { archived: false } },
  );
  return json.lists.map((l) => ({ id: l.id, name: l.name }));
}

export type ClickUpTask = {
  id: string;
  name: string;
  description?: string | null;
  status?: {
    status?: string | null;
    color?: string | null;
    type?: string | null;
  } | null;
  assignees?: Array<{ id: number; username?: string; email?: string }>;
  priority?: { id?: string; priority?: string } | null;
  due_date?: string | null;
  tags?: Array<{ name: string }>;
  url?: string | null;
};

type ClickUpTasksResponse = {
  tasks: ClickUpTask[];
  last_page?: boolean;
};

export async function fetchClickUpTasksPage(
  token: string,
  listId: string,
  page: number,
): Promise<{ tasks: ClickUpTask[]; lastPage: boolean }> {
  const json = await clickupFetch<ClickUpTasksResponse>(
    `/list/${listId}/task`,
    token,
    { query: { archived: false, page, subtasks: true } },
  );
  return { tasks: json.tasks ?? [], lastPage: json.last_page ?? false };
}

export type CreateClickUpTimeEntryInput = {
  tid: string;
  start: number;
  duration: number;
  description?: string;
  billable?: boolean;
};

type ClickUpCreateTimeEntryResponse = {
  data: { id: string };
};

export async function createClickUpTimeEntry(
  token: string,
  teamId: string,
  input: CreateClickUpTimeEntryInput,
): Promise<{ id: string }> {
  const json = await clickupFetch<ClickUpCreateTimeEntryResponse>(
    `/team/${teamId}/time_entries`,
    token,
    {
      method: "POST",
      body: {
        tid: input.tid,
        start: input.start,
        duration: input.duration,
        billable: input.billable ?? false,
        ...(input.description ? { description: input.description } : {}),
      },
    },
  );
  return { id: json.data.id };
}
