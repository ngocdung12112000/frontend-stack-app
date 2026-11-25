"use server";

import { revalidatePath } from "next/cache";
import { validationFailure } from "@/lib/auth/action-helpers";
import { fromProblem, networkFailure, type ActionResult } from "@/lib/auth/problem";
import { createAuthedApi, getAccessToken } from "@/lib/auth/session";
import {
  changePasswordSchema,
  revokeSessionSchema,
  type ChangePasswordInput,
} from "@/lib/schemas/auth";

// Server Actions on /account/** run behind the proxy, but `rt` is not sent here, so an
// action cannot refresh. A 401 comes back as code SESSION_EXPIRED and the client navigates
// to /api/auth/refresh?returnUrl= to rotate the cookies.
const expired = () => fromProblem(undefined, { status: 401, headers: new Headers() });

export async function changePasswordAction(input: ChangePasswordInput): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (!(await getAccessToken())) return expired();

  try {
    const { currentPassword, newPassword } = parsed.data;
    const { error, response } = await createAuthedApi().POST("/api/v1/auth/change-password", {
      body: { currentPassword, newPassword },
    });
    if (!response.ok) {
      return fromProblem(error, response, {
        fieldAliases: { password: "newPassword" },
      });
    }
  } catch {
    return networkFailure();
  }
  return { ok: true };
}

export async function revokeSessionAction(familyId: string): Promise<ActionResult> {
  const parsed = revokeSessionSchema.safeParse({ familyId });
  if (!parsed.success) return validationFailure(parsed.error);
  if (!(await getAccessToken())) return expired();

  try {
    const { error, response } = await createAuthedApi().DELETE(
      "/api/v1/users/me/sessions/{familyId}",
      { params: { path: { familyId: parsed.data.familyId } } },
    );
    if (!response.ok) return fromProblem(error, response);
  } catch {
    return networkFailure();
  }
  revalidatePath("/account/security");
  return { ok: true };
}

export async function resendConfirmationAction(): Promise<ActionResult> {
  if (!(await getAccessToken())) return expired();
  try {
    const { error, response } = await createAuthedApi().POST("/api/v1/auth/resend-confirmation");
    if (!response.ok) return fromProblem(error, response);
  } catch {
    return networkFailure();
  }
  return { ok: true };
}
