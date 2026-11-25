import { describe, expect, it } from "vitest";
import { makeJwt } from "@/mocks/jwt";
import { decideProxyAction } from "./proxy-decision";

const now = Math.floor(Date.now() / 1000);
const decide = (pathname: string, accessToken?: string, search = "", justRefreshed = false) =>
  decideProxyAction({ pathname, search, accessToken, nowSeconds: now, justRefreshed });

describe("decideProxyAction", () => {
  it("F01_AC6_NoCookie_RedirectsToLoginWithReturnUrl", () => {
    expect(decide("/account", undefined, "?tab=orders")).toEqual({
      action: "redirect",
      to: "/login?returnUrl=%2Faccount%3Ftab%3Dorders",
    });
    expect(decide("/checkout/payment")).toEqual({
      action: "redirect",
      to: "/login?returnUrl=%2Fcheckout%2Fpayment",
    });
  });

  it("F01_AC6_ExpiredAccessToken_RedirectsToRefresh", () => {
    expect(decide("/account", makeJwt({ expiresInSeconds: -30 }))).toEqual({
      action: "redirect",
      to: "/api/auth/refresh?returnUrl=%2Faccount",
    });
  });

  it("F01_AC6_TokenWithUnder60sLeft_RedirectsToRefresh", () => {
    expect(decide("/account/security", makeJwt({ expiresInSeconds: 59 })).action).toBe("redirect");
  });

  it("F01_AC6_TokenWith60sOrMore_Continues", () => {
    expect(decide("/account", makeJwt({ expiresInSeconds: 61 }))).toEqual({ action: "next" });
  });

  it("F01_AC6_JustRefreshed_ShortLivedButValidToken_DoesNotLoop", () => {
    expect(decide("/account", makeJwt({ expiresInSeconds: 20 }), "", true)).toEqual({
      action: "next",
    });
  });

  it("F01_AC6_JustRefreshed_YetExpiredToken_GoesToLoginInsteadOfLooping", () => {
    const decision = decide("/account", makeJwt({ expiresInSeconds: -5 }), "", true);
    expect(decision).toEqual({ action: "redirect", to: "/login?returnUrl=%2Faccount" });
  });

  it("F01_UnprotectedPaths_AreNeverRedirected", () => {
    expect(decide("/", undefined)).toEqual({ action: "next" });
    expect(decide("/accounting", undefined)).toEqual({ action: "next" });
    expect(decide("/login", makeJwt({ expiresInSeconds: -5 }))).toEqual({ action: "next" });
  });

  it("F01_MalformedCookie_TreatedAsLoggedOut", () => {
    const decision = decide("/account", "garbage");
    expect(decision.action).toBe("redirect");
    expect((decision as { to: string }).to).toMatch(/^\/login/);
  });
});
