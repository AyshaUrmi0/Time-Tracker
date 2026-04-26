"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ApiClientError } from "@/lib/api-client";
import { connectClickUpSchema } from "../clickup.schema";
import { useConnectClickUp } from "../clickup.queries";

export function ClickUpConnectForm() {
  const [token, setToken] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const connect = useConnectClickUp();

  function handleChange(value: string) {
    setToken(value);
    if (fieldError) setFieldError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);

    const parsed = connectClickUpSchema.safeParse({ personalToken: token });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setFieldError(issue?.message ?? "Invalid token");
      return;
    }

    try {
      await connect.mutateAsync(parsed.data);
      setToken("");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "VALIDATION_ERROR") {
          setFieldError("Token must look like pk_<digits>_<chars>");
        } else if (
          err.code === "CLICKUP_INVALID_TOKEN" ||
          err.code === "CLICKUP_TOKEN_IN_USE" ||
          err.code === "CLICKUP_UNREACHABLE" ||
          err.code === "CLICKUP_API_ERROR"
        ) {
          setFieldError(err.message);
        }
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
    >
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
          Connect ClickUp
        </h2>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Paste your ClickUp personal API token. We&apos;ll verify it and store
          it encrypted. You can find or generate one in ClickUp under{" "}
          <span className="font-medium text-[var(--text-primary)]">
            Settings → Apps → API Token
          </span>
          .
        </p>
      </div>
      <FormField
        id="clickup-token"
        label="Personal API token"
        error={fieldError ?? undefined}
        hint={fieldError ? undefined : "Format: pk_<digits>_<chars>"}
      >
        <Input
          id="clickup-token"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="pk_••••••••_•••••••••••••"
          value={token}
          onChange={(e) => handleChange(e.target.value)}
          error={!!fieldError}
          disabled={connect.isPending}
        />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={connect.isPending} disabled={!token.trim()}>
          Connect
        </Button>
      </div>
    </form>
  );
}
