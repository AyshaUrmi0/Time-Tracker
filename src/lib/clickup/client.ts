import { ApiErrors } from "../api-error";
import type { ClickUpUser } from "@/features/clickup/types";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

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
  let res: Response;
  try {
    res = await fetch(`${CLICKUP_API_BASE}/user`, {
      method: "GET",
      headers: { Authorization: token, "Content-Type": "application/json" },
      cache: "no-store",
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
      "ClickUp rejected the token. Make sure you copied the full personal API token.",
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

  const json = (await res.json()) as ClickUpUserResponse;
  return {
    id: json.user.id,
    username: json.user.username,
    email: json.user.email,
    color: json.user.color ?? null,
    profilePicture: json.user.profilePicture ?? null,
  };
}
