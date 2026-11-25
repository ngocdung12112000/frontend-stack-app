import { NextResponse, type NextRequest } from "next/server";
import { createServerApi } from "@/lib/api";
import {
  AT_COOKIE,
  REFRESH_THRESHOLD_SECONDS,
  RT_COOKIE,
  clearSessionCookies,
  isSecureRequest,
} from "@/lib/auth/cookie-options";
import { getTokenExpiry } from "@/lib/auth/jwt";
import { isSameOrigin } from "@/lib/auth/origin";
import { refreshTokens } from "@/lib/auth/refresh";
import { safeReturnUrl } from "@/lib/auth/return-url";

/**
 * POST /api/auth/logout  (form post; body fields: allDevices=1, returnUrl)
 * Revokes the refresh-token family (and, with allDevices, every session) and blacklists the
 * access token's jti, then clears both cookies. Cookies are cleared even if the API call fails.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) {
    return NextResponse.json({ code: "FORBIDDEN_ORIGIN" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const allDevices = form?.get("allDevices") === "1" || form?.get("allDevices") === "true";
  const returnUrl = safeReturnUrl(
    typeof form?.get("returnUrl") === "string" ? (form.get("returnUrl") as string) : null,
    "/",
  );

  const secure = isSecureRequest(request.headers);
  let accessToken = request.cookies.get(AT_COOKIE)?.value;
  let refreshToken = request.cookies.get(RT_COOKIE)?.value;

  try {
    // The logout endpoint needs a live access token; rotate first if it lapsed.
    const exp = getTokenExpiry(accessToken);
    const stale = exp === null || exp - Date.now() / 1000 < REFRESH_THRESHOLD_SECONDS;
    if (stale && refreshToken) {
      const outcome = await refreshTokens(refreshToken);
      if (outcome.kind === "ok") {
        accessToken = outcome.tokens.accessToken;
        refreshToken = outcome.tokens.refreshToken;
      }
    }
    if (accessToken) {
      await createServerApi().POST("/api/v1/auth/logout", {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { refreshToken: refreshToken ?? null, allDevices },
      });
    }
  } catch {
    // Best effort: the local session is cleared regardless.
  }

  // 303 so the browser follows with GET.
  const res = NextResponse.redirect(new URL(returnUrl, request.nextUrl), 303);
  clearSessionCookies(res.cookies, secure);
  return res;
}
