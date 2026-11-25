import { NextResponse, type NextRequest } from "next/server";
import { AT_COOKIE, REFRESHED_COOKIE } from "@/lib/auth/cookie-options";
import { decideProxyAction } from "@/lib/auth/proxy-decision";

/**
 * Next 16 `proxy` (formerly middleware). Cheap and network-free: it only inspects the `at`
 * cookie and redirects. Protects /account/** and /checkout/** (F01 AC-6); the silent refresh
 * itself happens in GET /api/auth/refresh because `rt` is scoped to /api/auth.
 */
export function proxy(request: NextRequest) {
  const decision = decideProxyAction({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    accessToken: request.cookies.get(AT_COOKIE)?.value,
    justRefreshed: request.cookies.has(REFRESHED_COOKIE),
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.nextUrl));
  }
  return NextResponse.next();
}

// Prefetches are excluded (Next strips the prefetch header inside the proxy, so it has to be
// expressed here): redirecting a prefetch to the refresh handler would rotate tokens early
// and cache a redirect. The page itself still requires a valid token for its data.
// Matcher values must be statically analysable, hence the repetition.
export const config = {
  matcher: [
    {
      source: "/account/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
    {
      source: "/checkout/:path*",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
