// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { makeJwt } from "@/mocks/jwt";
import { config, proxy } from "./proxy";

const req = (path: string, at?: string) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: at ? { cookie: `at=${at}` } : {},
  });

describe("proxy", () => {
  it("F01_AC6_ExpiredAt_RedirectsToRefreshWithReturnUrl", () => {
    const res = proxy(req("/account?x=1", makeJwt({ expiresInSeconds: -1 })));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/api/auth/refresh");
    expect(location.searchParams.get("returnUrl")).toBe("/account?x=1");
  });

  it("F01_AC6_RefreshedMarker_PreventsRefreshLoopForShortLivedTokens", () => {
    const request = new NextRequest("http://localhost:3000/account", {
      headers: { cookie: `at=${makeJwt({ expiresInSeconds: 20 })}; rf=1` },
    });
    expect(proxy(request).headers.get("location")).toBeNull();
  });

  it("F01_NoSession_RedirectsToLogin", () => {
    const res = proxy(req("/checkout"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("F01_ValidSession_PassesThrough", () => {
    const res = proxy(req("/account", makeJwt({ expiresInSeconds: 600 })));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("F01_Matcher_CoversAccountAndCheckout_AndSkipsPrefetches", () => {
    const sources = config.matcher.map((m) => m.source);
    expect(sources).toEqual(["/account/:path*", "/checkout/:path*"]);
    for (const m of config.matcher) {
      expect(m.missing.map((x) => x.key)).toEqual(["next-router-prefetch", "purpose"]);
    }
  });
});
