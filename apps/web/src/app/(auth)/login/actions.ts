"use server";

import { redirect } from "next/navigation";
import { createServerApi } from "@/lib/api";
import { persistSession, toTokenPair, validationFailure } from "@/lib/auth/action-helpers";
import { fromProblem, networkFailure, type ActionFailure } from "@/lib/auth/problem";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";

/** Returns only on failure; on success it sets the cookies and redirects. */
export async function loginAction(input: LoginInput, returnUrl?: string): Promise<ActionFailure> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  let tokens;
  try {
    const { data, error, response } = await createServerApi().POST("/api/v1/auth/login", {
      body: parsed.data,
    });
    tokens = data ? toTokenPair(data) : null;
    if (!tokens) return fromProblem(error, response);
  } catch {
    return networkFailure();
  }

  await persistSession(tokens);
  redirect(safeReturnUrl(returnUrl, "/account"));
}
