// @vitest-environment node
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { makeJwt } from "@/mocks/jwt";
import { server } from "@/mocks/server";
import { resetRefreshCache } from "@/lib/auth/refresh";
import { POST } from "./route";

const base = process.env.API_BASE_URL || "http://localhost:5000";

function req(opts: { origin?: string | null; cookie?: string; form?: Record<string, string> }) {
  const body = new URLSearchParams(opts.form ?? {});
  const headers: Record<string, string> = {
    host: "localhost:3000",
    "content-type": "application/x-www-form-urlencoded",
  };
  if (opts.origin !== null) headers.origin = opts.origin ?? "http://localhost:3000";
  if (opts.cookie) headers.cookie = opts.cookie;
  return new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => resetRefreshCache());

describe("POST /api/auth/logout", () => {
  it("F01_AC5_CallsApiWithBearerAndRt_ThenClearsCookies", async () => {
    const at = makeJwt();
    let seen: { auth: string | null; body: unknown } | undefined;
    server.use(
      http.post(`${base}/api/v1/auth/logout`, async ({ request }) => {
        seen = { auth: request.headers.get("authorization"), body: await request.json() };
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const res = await POST(req({ cookie: `at=${at}; rt=rt-1` }));
    expect(seen).toEqual({
      auth: `Bearer ${at}`,
      body: { refreshToken: "rt-1", allDevices: false },
    });
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
    const cookies = res.headers.getSetCookie();
    expect(cookies.find((c) => c.startsWith("at="))).toMatch(/Max-Age=0/i);
    expect(cookies.find((c) => c.startsWith("rt="))).toMatch(/Path=\/api\/auth.*Max-Age=0|Max-Age=0.*Path=\/api\/auth/i);
  });

  it("F01_AC5_AllDevicesFlag_IsForwarded", async () => {
    let body: { allDevices?: boolean } | undefined;
    server.use(
      http.post(`${base}/api/v1/auth/logout`, async ({ request }) => {
        body = (await request.json()) as { allDevices?: boolean };
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await POST(req({ cookie: `at=${makeJwt()}; rt=rt-1`, form: { allDevices: "1" } }));
    expect(body?.allDevices).toBe(true);
  });

  it("F01_Logout_ClearsCookiesEvenWhenApiFails", async () => {
    server.use(http.post(`${base}/api/v1/auth/logout`, () => HttpResponse.error()));
    const res = await POST(req({ cookie: `at=${makeJwt()}; rt=rt-1` }));
    expect(res.status).toBe(303);
    expect(res.headers.getSetCookie().some((c) => /^at=;?.*Max-Age=0/i.test(c))).toBe(true);
  });

  it("F01_Logout_WithExpiredAt_RefreshesFirstSoTheJtiCanBeBlacklisted", async () => {
    const fresh = makeJwt();
    let auth: string | null = null;
    server.use(
      http.post(`${base}/api/v1/auth/refresh`, () =>
        HttpResponse.json({ accessToken: fresh, refreshToken: "rt-2", expiresIn: 900 }),
      ),
      http.post(`${base}/api/v1/auth/logout`, ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await POST(req({ cookie: `at=${makeJwt({ expiresInSeconds: -10 })}; rt=rt-1` }));
    expect(auth).toBe(`Bearer ${fresh}`);
  });

  it("F01_Logout_RejectsMissingOrForeignOrigin", async () => {
    server.use(
      http.post(`${base}/api/v1/auth/logout`, () => {
        throw new Error("must not be called");
      }),
    );
    expect((await POST(req({ origin: null, cookie: "rt=rt-1" }))).status).toBe(403);
    expect((await POST(req({ origin: "https://evil.example", cookie: "rt=rt-1" }))).status).toBe(
      403,
    );
  });

  it("F01_Logout_IgnoresOpenRedirectReturnUrl", async () => {
    const res = await POST(
      req({ cookie: "rt=rt-1", form: { returnUrl: "https://evil.example" } }),
    );
    expect(new URL(res.headers.get("location")!).host).toBe("localhost:3000");
  });
});
