"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle, Button } from "@stackshop/ui";
import { confirmEmailAction } from "@/app/(auth)/verify-email/actions";
import { refreshUrl } from "@/lib/auth/return-url";

type State = { status: "pending" } | { status: "done" } | { status: "error"; message: string };

/**
 * Confirms on mount (not during server render, so link prefetchers and mail scanners that
 * only fetch HTML cannot burn the single-use token). The ref guard keeps React strict-mode's
 * double effect from submitting the token twice.
 */
export function VerifyEmailStatus({ userId, token }: { userId: string; token: string }) {
  const [state, setState] = useState<State>({ status: "pending" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void confirmEmailAction({ userId, token }).then((result) => {
      setState(
        result.ok
          ? { status: "done" }
          : {
              status: "error",
              message: result.formError ?? "We could not confirm your email.",
            },
      );
    });
  }, [userId, token]);

  if (state.status === "pending") {
    return (
      <p role="status" className="flex items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Confirming your email...
      </p>
    );
  }

  if (state.status === "done") {
    return (
      <div className="grid gap-4">
        <Alert variant="success">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Email confirmed</AlertTitle>
          <AlertDescription>Thanks! Your email address is now verified.</AlertDescription>
        </Alert>
        {/* Plain anchor on purpose: the refresh handler must not be prefetched. It re-issues
            the access token so the email_verified claim (and the header banner) updates. */}
        <Button asChild>
          <a href={refreshUrl("/account")}>Go to my account</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Alert variant="destructive">
        <XCircle aria-hidden="true" />
        <AlertTitle>Confirmation failed</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">
        Log in and use &ldquo;Resend confirmation&rdquo; in your account security settings to get a
        new link.
      </p>
      <Button asChild variant="outline">
        <Link href="/login?returnUrl=%2Faccount%2Fsecurity">Log in</Link>
      </Button>
    </div>
  );
}
