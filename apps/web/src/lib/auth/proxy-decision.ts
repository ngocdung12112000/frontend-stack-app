import { REFRESH_THRESHOLD_SECONDS } from "./cookie-options";
import { getTokenExpiry } from "./jwt";
import { loginUrl, refreshUrl } from "./return-url";

export type ProxyDecision =
  | { action: "next" }
  | { action: "redirect"; to: string };

const PROTECTED_PREFIXES = ["/account", "/checkout"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Pure decision for proxy.ts. No network calls: `rt` is path-scoped to /api/auth so the proxy
 * cannot read it. It only looks at `at`:
 *  - no `at` at all            -> no session -> /login?returnUrl=
 *  - `at` expired / < 60s left -> /api/auth/refresh?returnUrl= (rotates the cookies, then returns)
 *  - otherwise                 -> continue
 */
export function decideProxyAction(input: {
  pathname: string;
  search: string;
  accessToken: string | undefined;
  nowSeconds: number;
  /** The refresh handler ran moments ago (loop guard, see REFRESHED_COOKIE). */
  justRefreshed?: boolean;
}): ProxyDecision {
  const { pathname, search, accessToken, nowSeconds, justRefreshed = false } = input;
  if (!isProtectedPath(pathname)) return { action: "next" };

  const returnUrl = `${pathname}${search}`;
  if (!accessToken) return { action: "redirect", to: loginUrl(returnUrl) };

  const exp = getTokenExpiry(accessToken);
  // Malformed cookie: treat as logged out (clearing happens on the login page / refresh route).
  if (exp === null) return { action: "redirect", to: loginUrl(returnUrl) };

  if (justRefreshed) {
    // Never refresh twice in a row. A token that is still valid is fine; one that is already
    // expired right after a refresh means something is wrong (clock skew): ask for a login.
    return exp > nowSeconds ? { action: "next" } : { action: "redirect", to: loginUrl(returnUrl) };
  }

  if (exp - nowSeconds < REFRESH_THRESHOLD_SECONDS) {
    return { action: "redirect", to: refreshUrl(returnUrl) };
  }
  return { action: "next" };
}
