import "server-only";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { applySessionCookies, isSecureRequest, type TokenPair } from "./cookie-options";
import type { ActionFailure } from "./problem";

/** Writes `at`/`rt` from a Server Action. Tokens never reach the client. */
export async function persistSession(tokens: TokenPair): Promise<void> {
  const jar = await cookies();
  const secure = isSecureRequest(await headers());
  applySessionCookies(jar, tokens, secure);
}

/** zod failure -> field errors keyed by form field name. */
export function validationFailure(error: z.ZodError): ActionFailure {
  const { fieldErrors } = z.flattenError(error);
  const mapped: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (Array.isArray(value) && value.length) mapped[key] = value as string[];
  }
  return {
    ok: false,
    code: "IDENTITY_VALIDATION_FAILED",
    formError: "Please check the highlighted fields and try again.",
    fieldErrors: mapped,
  };
}

export function toTokenPair(data: {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresIn?: number;
}): TokenPair | null {
  if (!data.accessToken || !data.refreshToken) return null;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn ?? 900,
  };
}
