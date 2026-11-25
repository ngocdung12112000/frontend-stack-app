"use server";

import { createServerApi } from "@/lib/api";
import { validationFailure } from "@/lib/auth/action-helpers";
import { fromProblem, networkFailure, type ActionResult } from "@/lib/auth/problem";
import { confirmEmailSchema, type ConfirmEmailInput } from "@/lib/schemas/auth";

export async function confirmEmailAction(input: ConfirmEmailInput): Promise<ActionResult> {
  const parsed = confirmEmailSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ...validationFailure(parsed.error),
      code: "IDENTITY_TOKEN_INVALID",
      formError: "This confirmation link is invalid or has expired.",
    };
  }
  try {
    const { error, response } = await createServerApi().POST("/api/v1/auth/confirm-email", {
      body: parsed.data,
    });
    if (!response.ok) return fromProblem(error, response);
  } catch {
    return networkFailure();
  }
  return { ok: true };
}
