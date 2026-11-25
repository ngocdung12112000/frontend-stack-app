"use client";

import { Monitor } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@stackshop/ui";
import { revokeSessionAction } from "@/app/account/security/actions";
import { SESSION_EXPIRED } from "@/lib/auth/problem";
import { refreshUrl } from "@/lib/auth/return-url";
import { FormAlert } from "./form-utils";

export type SessionRow = {
  familyId: string;
  userAgent: string | null;
  ip: string | null;
  startedAt: string;
  lastUsedAt: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No other active sessions.</p>;
  }

  const revoke = (familyId: string) => {
    setError(null);
    setRevoking(familyId);
    startTransition(async () => {
      const result = await revokeSessionAction(familyId);
      if (!result.ok) {
        if (result.code === SESSION_EXPIRED) {
          window.location.assign(refreshUrl("/account/security"));
          return;
        }
        setError(result.formError ?? "Could not sign out that session.");
      }
      setRevoking(null);
    });
  };

  return (
    <div className="grid gap-3">
      <FormAlert message={error} />
      <ul className="grid gap-3" aria-label="Active sessions">
        {sessions.map((s) => (
          <li
            key={s.familyId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Monitor className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{s.userAgent || "Unknown device"}</p>
                <p className="text-muted-foreground">
                  {s.ip ? `${s.ip} - ` : ""}Last active {formatWhen(s.lastUsedAt)}
                </p>
                <p className="text-muted-foreground">Signed in {formatWhen(s.startedAt)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => revoke(s.familyId)}
              disabled={pending}
              aria-label={`Sign out session on ${s.userAgent || "unknown device"}`}
            >
              {pending && revoking === s.familyId ? "Signing out..." : "Sign out"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
