"use server";

import { redirect } from "next/navigation";
import { createServerApi } from "@/lib/api";
import { persistSession, toTokenPair, validationFailure } from "@/lib/auth/action-helpers";
import { fromProblem, networkFailure, type ActionFailure } from "@/lib/auth/problem";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth";

/**
 * Registers, then signs the new user in (BR-04: unconfirmed users may shop; the header banner
 * reminds them to confirm). Returns only on failure.
 */
export async function registerAction(
  input: RegisterInput,
  returnUrl?: string,
): Promise<ActionFailure> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const api = createServerApi();
  let tokens;
  try {
    const reg = await api.POST("/api/v1/auth/register", { body: parsed.data });
    if (reg.error || !reg.response.ok) {
      return fromProblem(reg.error, reg.response);
    }
    const login = await api.POST("/api/v1/auth/login", {
      body: { email: parsed.data.email, password: parsed.data.password },
    });
    tokens = login.data ? toTokenPair(login.data) : null;
  } catch {
    return networkFailure();
  }

  // Account exists but auto-login failed: send them to the login form.
  if (!tokens) redirect("/login?registered=1");

  await persistSession(tokens);
  redirect(safeReturnUrl(returnUrl, "/account"));
}
