import "server-only";
import { createStackShopClient } from "@ngocdung12112000/api-client";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getApiBaseUrl } from "@/lib/api";
import { AT_COOKIE } from "./cookie-options";
import { userFromToken, type SessionUser } from "./jwt";

/** Raw access token cookie (may be expired). Reading it makes the caller dynamic. */
export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(AT_COOKIE)?.value;
}

/**
 * The signed-in user decoded from the `at` cookie, or null when absent/expired/malformed.
 * Display and routing only: the API re-checks every token. Under cacheComponents this reads
 * request data, so callers must sit inside a <Suspense> boundary.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const user = userFromToken(await getAccessToken());
  if (!user) return null;
  // Date.now() is only allowed once the render is known to be request-time.
  await connection();
  return user.exp * 1000 > Date.now() ? user : null;
});

/** Typed gateway client that attaches the `at` cookie as the Bearer token. */
export function createAuthedApi() {
  return createStackShopClient({ baseUrl: getApiBaseUrl(), getAccessToken });
}
