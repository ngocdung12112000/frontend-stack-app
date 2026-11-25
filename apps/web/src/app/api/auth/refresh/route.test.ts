// @vitest-environment node
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { makeJwt } from "@/mocks/jwt";
import { problem } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { resetRefreshCache } from "@/lib/auth/refresh";
import { GET } from "./route";

const base = process.env.API_BASE_URL || "http://localhost:5000";
const refreshEndpoint = `${base}/api/v1/auth/refresh`;

function req(returnUrl: string | null, cookie?: string, headers: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/auth/refresh");
  if (returnUrl !== null) url.searchParams.set("returnUrl", returnUrl);
  return new NextRequest(url, {
    headers: { host: "localhost:3000", ...(cookie ? { cookie } : {}), ...headers },
  });
}

const setCookies = (res: Response) => res.headers.getSetCookie();
const cookieNamed = (res: Response, name: string) =>
  setCookies(res).find((c) => c.startsWith(`${name}=`)) ?? "";

beforeEach(() => resetRefreshCache());

describe("GET /api/auth/refresh", () => {
  it("F01_AC6_RotatesBothCookiesAndRedirectsBack", async () => {
    server.use(
      http.post(refreshEndpoint, async ({ request }) => {
        expect(await request.json()).toEqual({ refreshToken: "rt-old" });
        return HttpResponse.json({
          accessToken: makeJwt(),
          refreshToken: "rt-new",
          expiresIn: 900,
        });
      }),
    );
    const res = await GET(req("/account/security", "rt=rt-old"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/account/security");

    const at = cookieNamed(res, "at");
    const rt = cookieNamed(res, "rt");
    expect(at).toMatch(/HttpOnly/i);
    expect(at).toMatch(/SameSite=lax/i);
    expect(at).toMatch(/Path=\//);
    expect(rt).toContain("rt=rt-new");
    expect(cookieNamed(res, "rf")).toMatch(/Max-Age=10/i);
    expect(rt).toMatch(/SameSite=strict/i);
    expect(rt).toMatch(/Path=\/api\/auth/);
    // plain-http localhost: Secure must be off or the browser drops the cookie
    expect(at).not.toMatch(/Secure/i);
  });

  it("F01_Cookies_AreSecureOffLocalhost", async () => {
    const res = await GET(
      req("/account", "rt=rt-old", { host: "shop.example.com", "x-forwarded-proto": "https" }),
    );
    expect(cookieNamed(res, "rt")).toMatch(/Secure/i);
  });

  it.each(["IDENTITY_REFRESH_REUSED", "IDENTITY_REFRESH_INVALID"])(
    "F01_AC4_%s_ClearsCookiesAndRedirectsToLogin",
    async (code) => {
      server.use(http.post(refreshEndpoint, () => problem(401, code)));
      const res = await GET(req("/account", "rt=rt-old; at=stale"));
      const location = new URL(res.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("returnUrl")).toBe("/account");
      expect(cookieNamed(res, "at")).toMatch(/Max-Age=0/i);
      const rt = cookieNamed(res, "rt");
      expect(rt).toMatch(/Max-Age=0/i);
      expect(rt).toMatch(/Path=\/api\/auth/);
    },
  );

  it("F01_AC6_NoRefreshToken_GoesToLogin_WithoutCallingApi", async () => {
    server.use(
      http.post(refreshEndpoint, () => {
        throw new Error("must not be called");
      }),
    );
    const res = await GET(req("/checkout", "at=expired"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("F01_AC6_ParallelRequestsWithSameRt_CallRefreshOnce", async () => {
    let calls = 0;
    server.use(
      http.post(refreshEndpoint, async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({
          accessToken: makeJwt(),
          refreshToken: `rt-rotated-${calls}`,
          expiresIn: 900,
        });
      }),
    );
    const responses = await Promise.all([
      GET(req("/account", "rt=rt-shared")),
      GET(req("/account/security", "rt=rt-shared")),
      GET(req("/account", "rt=rt-shared")),
    ]);
    expect(calls).toBe(1);
    for (const res of responses) {
      expect(cookieNamed(res, "rt")).toContain("rt=rt-rotated-1");
    }
  });

  it("F01_AC4_StragglerWithOldRtJustAfterRotation_DoesNotTriggerReuse", async () => {
    let calls = 0;
    server.use(
      http.post(refreshEndpoint, () => {
        calls += 1;
        // A second call with the rotated-away token is what the API treats as reuse.
        if (calls > 1) return problem(401, "IDENTITY_REFRESH_REUSED");
        return HttpResponse.json({ accessToken: makeJwt(), refreshToken: "rt-2", expiresIn: 900 });
      }),
    );
    await GET(req("/account", "rt=rt-1"));
    const late = await GET(req("/account", "rt=rt-1"));
    expect(calls).toBe(1);
    expect(new URL(late.headers.get("location")!).pathname).toBe("/account");
  });

  it("F01_GatewayDown_KeepsRtAndShowsNoticeInsteadOfLooping", async () => {
    server.use(http.post(refreshEndpoint, () => HttpResponse.error()));
    const res = await GET(req("/account", "rt=rt-old; at=stale"));
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("notice")).toBe("unavailable");
    expect(cookieNamed(res, "rt")).toBe("");
  });

  it("F01_OpenRedirect_ReturnUrlToOtherSite_IsIgnored", async () => {
    const res = await GET(req("https://evil.example/phish", "rt=rt-open"));
    expect(new URL(res.headers.get("location")!).host).toBe("localhost:3000");
  });

  it("F01_CrossSiteNavigation_DoesNotRotateTokens", async () => {
    server.use(
      http.post(refreshEndpoint, () => {
        throw new Error("must not be called");
      }),
    );
    const res = await GET(req("/account", "rt=rt-x", { "sec-fetch-site": "cross-site" }));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    expect(setCookies(res)).toHaveLength(0);
  });
});
