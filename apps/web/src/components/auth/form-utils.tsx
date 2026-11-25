"use client";

import { AlertCircle } from "lucide-react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { Alert, AlertDescription } from "@stackshop/ui";
import { SESSION_EXPIRED, type ActionFailure } from "@/lib/auth/problem";
import { refreshUrl } from "@/lib/auth/return-url";

/**
 * Applies a failed ActionResult to a react-hook-form instance: field errors go on their
 * fields (focus moves to the first one), and the form-level message is returned for an Alert.
 * An expired session navigates to the refresh handler, which returns here with fresh cookies.
 */
export function applyFailure<T extends FieldValues>(
  form: UseFormReturn<T>,
  failure: ActionFailure,
  options: { returnPath?: string } = {},
): string | null {
  if (failure.code === SESSION_EXPIRED && options.returnPath) {
    window.location.assign(refreshUrl(options.returnPath));
    return null;
  }
  let first = true;
  for (const [field, messages] of Object.entries(failure.fieldErrors ?? {})) {
    form.setError(
      field as Path<T>,
      { type: "server", message: messages[0] },
      { shouldFocus: first },
    );
    first = false;
  }
  return failure.formError ?? null;
}

export function FormAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
