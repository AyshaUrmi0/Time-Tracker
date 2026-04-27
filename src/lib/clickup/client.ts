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

type ClickUpRawTeamMember = {
  user?: {
    id?: number;
    username?: string | null;
    email?: string | null;
  } | null;
};

type ClickUpTeamsResponse = {
  teams: Array<{
    id: string;
    name: string;
    color?: string | null;
    avatar?: string | null;
    members?: ClickUpRawTeamMember[];
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

export type ClickUpTeamMember = {
  teamId: string;
  teamName: string;
  clickupUserId: number;
  username: string | null;
  email: string;
};

export async function fetchClickUpTeamsWithMembers(
  token: string,
): Promise<{ teams: ClickUpTeam[]; members: ClickUpTeamMember[] }> {
  const json = await clickupFetch<ClickUpTeamsResponse>("/team", token);
  const teams: ClickUpTeam[] = [];
  const members: ClickUpTeamMember[] = [];
  for (const t of json.teams) {
    teams.push({
      id: t.id,
      name: t.name,
      color: t.color ?? null,
      avatar: t.avatar ?? null,
    });
    for (const m of t.members ?? []) {
      const u = m.user;
      if (!u || typeof u.id !== "number" || !u.email) continue;
      members.push({
        teamId: t.id,
        teamName: t.name,
        clickupUserId: u.id,
        username: u.username ?? null,
        email: u.email,
      });
    }
  }
  return { teams, members };
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

export type ClickUpTaskDetail = ClickUpTask & {
  team_id?: string | null;
  list?: { id: string; name?: string | null } | null;
  folder?: { id: string; name?: string | null } | null;
  space?: { id: string; name?: string | null } | null;
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

export type ClickUpListStatus = {
  status: string;
  type: string;
  color: string | null;
  orderindex: number;
};

type ClickUpListResponse = {
  statuses?: Array<{
    status: string;
    type: string;
    color?: string | null;
    orderindex: number;
  }>;
};

export async function fetchClickUpListStatuses(
  token: string,
  listId: string,
): Promise<ClickUpListStatus[]> {
  const json = await clickupFetch<ClickUpListResponse>(`/list/${listId}`, token);
  return (json.statuses ?? []).map((s) => ({
    status: s.status,
    type: s.type,
    color: s.color ?? null,
    orderindex: s.orderindex,
  }));
}

export type UpdateClickUpTaskInput = {
  name?: string;
  description?: string | null;
  status?: string;
  assignees?: { add?: number[]; rem?: number[] };
  archived?: boolean;
};

export async function updateClickUpTask(
  token: string,
  taskId: string,
  input: UpdateClickUpTaskInput,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.description !== undefined) body.description = input.description ?? "";
  if (input.status !== undefined) body.status = input.status;
  if (input.assignees) body.assignees = input.assignees;
  if (input.archived !== undefined) body.archived = input.archived;
  await clickupFetch<unknown>(`/task/${taskId}`, token, {
    method: "PUT",
    body,
  });
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

export async function fetchClickUpTaskDetail(
  token: string,
  taskId: string,
): Promise<ClickUpTaskDetail | null> {
  try {
    return await clickupFetch<ClickUpTaskDetail>(`/task/${taskId}`, token);
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

export type CreateClickUpWebhookInput = {
  endpoint: string;
  events: string[];
};

type ClickUpCreateWebhookResponse = {
  id: string;
  webhook: {
    id: string;
    secret: string;
  };
};

export async function createClickUpWebhookOnClickUp(
  token: string,
  teamId: string,
  input: CreateClickUpWebhookInput,
): Promise<{ id: string; secret: string }> {
  const json = await clickupFetch<ClickUpCreateWebhookResponse>(
    `/team/${teamId}/webhook`,
    token,
    {
      method: "POST",
      body: { endpoint: input.endpoint, events: input.events },
    },
  );
  return { id: json.webhook.id, secret: json.webhook.secret };
}

export async function deleteClickUpWebhookOnClickUp(
  token: string,
  webhookId: string,
): Promise<void> {
  await clickupFetch<unknown>(`/webhook/${webhookId}`, token, {
    method: "DELETE",
  });
}

export type ClickUpTimeEntry = {
  id: string;
  taskId: string | null;
  teamId: string;
  userId: number;
  start: number;
  end: number | null;
  duration: number;
  description: string | null;
  billable: boolean;
};

type ClickUpTimeEntriesResponse = {
  data?: Array<{
    id: string;
    task?: { id?: string | null } | null;
    wid?: string | null;
    user?: { id?: number | null } | null;
    start?: string | number | null;
    end?: string | number | null;
    duration?: string | number | null;
    description?: string | null;
    billable?: boolean | null;
  }>;
};

function parseMs(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export async function fetchClickUpTimeEntries(
  token: string,
  teamId: string,
  opts: { startMs: number; endMs: number },
): Promise<ClickUpTimeEntry[]> {
  const json = await clickupFetch<ClickUpTimeEntriesResponse>(
    `/team/${teamId}/time_entries`,
    token,
    { query: { start_date: opts.startMs, end_date: opts.endMs } },
  );
  const entries: ClickUpTimeEntry[] = [];
  for (const e of json.data ?? []) {
    const start = parseMs(e.start);
    const duration = parseMs(e.duration);
    if (start === null || duration === null) continue;
    if (typeof e.user?.id !== "number") continue;
    entries.push({
      id: e.id,
      taskId: e.task?.id ?? null,
      teamId: e.wid ?? teamId,
      userId: e.user.id,
      start,
      end: parseMs(e.end),
      duration,
      description: e.description ?? null,
      billable: e.billable ?? false,
    });
  }
  return entries;
}

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
