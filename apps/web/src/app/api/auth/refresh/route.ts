import { NextResponse, type NextRequest } from "next/server";
import {
  AT_COOKIE,
  RT_COOKIE,
  applySessionCookies,
  clearSessionCookies,
  isSecureRequest,
  markRefreshed,
} from "@/lib/auth/cookie-options";
import { refreshTokens } from "@/lib/auth/refresh";
import { loginUrl, safeReturnUrl } from "@/lib/auth/return-url";

/**
 * GET /api/auth/refresh?returnUrl=/account
 * proxy.ts sends navigations here when `at` is missing/expiring. `rt` is scoped to
 * /api/auth, so this is the only place that can read it. Rotates both cookies and
 * redirects back; on a dead session clears them and goes to /login.
 */
export async function GET(request: NextRequest) {
  const returnUrl = safeReturnUrl(request.nextUrl.searchParams.get("returnUrl"), "/");
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl));

  // A cross-site page must not be able to trigger token rotation. Same-site / direct
  // navigations (and the proxy's own redirect) are fine.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return redirectTo("/");
  }

  const secure = isSecureRequest(request.headers);
  const refreshToken = request.cookies.get(RT_COOKIE)?.value;

  if (!refreshToken) {
    const res = redirectTo(loginUrl(returnUrl));
    clearSessionCookies(res.cookies, secure);
    return res;
  }

  const outcome = await refreshTokens(refreshToken);

  if (outcome.kind === "ok") {
    const res = redirectTo(returnUrl);
    applySessionCookies(res.cookies, outcome.tokens, secure);
    markRefreshed(res.cookies, secure);
    return res;
  }

  if (outcome.kind === "invalid") {
    // IDENTITY_REFRESH_REUSED / IDENTITY_REFRESH_INVALID: the session is over.
    const res = redirectTo(loginUrl(returnUrl));
    clearSessionCookies(res.cookies, secure);
    return res;
  }

  // Gateway unavailable: keep cookies, show the login page's notice instead of looping
  // between proxy and this handler.
  const url = new URL(loginUrl(returnUrl), request.nextUrl);
  url.searchParams.set("notice", "unavailable");
  const res = NextResponse.redirect(url);
  // Make sure an unreadable stale `at` does not bounce the user straight back here.
  res.cookies.delete(AT_COOKIE);
  return res;
}
