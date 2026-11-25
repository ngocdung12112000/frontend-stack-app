"use server";

import { createServerApi } from "@/lib/api";
import { validationFailure } from "@/lib/auth/action-helpers";
import { fromProblem, networkFailure, type ActionResult } from "@/lib/auth/problem";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const { email, token, newPassword } = parsed.data;
    const { error, response } = await createServerApi().POST("/api/v1/auth/reset-password", {
      body: { email, token, newPassword },
    });
    if (!response.ok) {
      return fromProblem(error, response, { fieldAliases: { password: "newPassword" } });
    }
  } catch {
    return networkFailure();
  }
  return { ok: true };
}
