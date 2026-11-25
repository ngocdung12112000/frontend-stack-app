import { describe, expect, it } from "vitest";
import { loginUrl, refreshUrl, safeReturnUrl } from "./return-url";

describe("safeReturnUrl", () => {
  it("F01_AC6_ReturnUrl_AllowsSameSiteRelativePathsWithQueryAndHash", () => {
    expect(safeReturnUrl("/account")).toBe("/account");
    expect(safeReturnUrl("/checkout/shipping?step=2#top")).toBe("/checkout/shipping?step=2#top");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "/a\r\nSet-Cookie: x=1",
    "evil.example",
    "",
  ])("F01_ReturnUrl_RejectsOpenRedirect_%j", (value) => {
    expect(safeReturnUrl(value, "/fallback")).toBe("/fallback");
  });

  it("F01_ReturnUrl_RejectsAuthEndpointsToAvoidLoops", () => {
    expect(safeReturnUrl("/login?x=1", "/")).toBe("/");
    expect(safeReturnUrl("/api/auth/refresh?returnUrl=/", "/")).toBe("/");
  });

  it("F01_ReturnUrl_HandlesNullUndefinedAndHugeInput", () => {
    expect(safeReturnUrl(null)).toBe("/account");
    expect(safeReturnUrl(undefined, "/x")).toBe("/x");
    expect(safeReturnUrl("/" + "a".repeat(3000), "/x")).toBe("/x");
  });

  it("F01_ReturnUrl_BuildsEncodedLoginAndRefreshUrls", () => {
    expect(loginUrl("/account?tab=1")).toBe("/login?returnUrl=%2Faccount%3Ftab%3D1");
    expect(loginUrl("https://evil.example")).toBe("/login");
    expect(refreshUrl("/account")).toBe("/api/auth/refresh?returnUrl=%2Faccount");
  });
});
