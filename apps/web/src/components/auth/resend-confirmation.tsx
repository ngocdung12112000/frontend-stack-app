"use client";

import { useState, useTransition } from "react";
import { Button } from "@stackshop/ui";
import { resendConfirmationAction } from "@/app/account/security/actions";
import { SESSION_EXPIRED } from "@/lib/auth/problem";
import { refreshUrl } from "@/lib/auth/return-url";

type Props = { variant?: "button" | "link"; returnPath?: string };

export function ResendConfirmationButton({ variant = "button", returnPath = "/account" }: Props) {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await resendConfirmationAction();
      if (result.ok) {
        setMessage({ text: "Confirmation email sent. Check your inbox.", error: false });
      } else if (result.code === SESSION_EXPIRED) {
        window.location.assign(refreshUrl(returnPath));
      } else {
        setMessage({ text: result.formError ?? "Could not send the email.", error: true });
      }
    });
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={variant === "link" ? "link" : "outline"}
        size={variant === "link" ? "sm" : "default"}
        className={variant === "link" ? "h-auto p-0 font-medium text-current underline" : undefined}
        onClick={send}
        disabled={pending}
      >
        {pending ? "Sending..." : "Resend confirmation email"}
      </Button>
      {message && (
        <span role="status" className={message.error ? "text-destructive" : undefined}>
          {message.text}
        </span>
      )}
    </span>
  );
}
