"use server";

import { createServerApi } from "@/lib/api";
import { validationFailure } from "@/lib/auth/action-helpers";
import type { ActionResult } from "@/lib/auth/problem";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth";

/**
 * BR-07 / AC-7: the outcome never depends on whether the email exists. Anything the API
 * says (including errors and outages) is swallowed after validation, so the response is
 * identical for known and unknown addresses.
 */
export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    await createServerApi().POST("/api/v1/auth/forgot-password", { body: parsed.data });
  } catch {
    // Same response either way.
  }
  return { ok: true };
}
