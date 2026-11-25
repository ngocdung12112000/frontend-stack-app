import { describe, expect, it, vi } from "vitest";
import {
  applySessionCookies,
  clearSessionCookies,
  isSecureRequest,
  type CookieJar,
} from "./cookie-options";

const h = (init: Record<string, string>) => new Headers(init);

describe("session cookies", () => {
  it("F01_AC1_SetsAtLaxAndRtStrictScopedToApiAuth", () => {
    const set = vi.fn();
    const jar: CookieJar = { set };
    applySessionCookies(jar, { accessToken: "AT", refreshToken: "RT", expiresIn: 900 }, true);
    expect(set).toHaveBeenCalledWith("at", "AT", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    expect(set).toHaveBeenCalledWith("rt", "RT", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/api/auth",
      maxAge: 604800,
    });
  });

  it("F01_AC5_ClearCookies_UsesSamePathsWithMaxAge0", () => {
    const set = vi.fn();
    clearSessionCookies({ set }, false);
    expect(set).toHaveBeenCalledWith("at", "", expect.objectContaining({ path: "/", maxAge: 0 }));
    expect(set).toHaveBeenCalledWith(
      "rt",
      "",
      expect.objectContaining({ path: "/api/auth", maxAge: 0, secure: false }),
    );
  });

  it.each([
    [{ host: "localhost:3000" }, false],
    [{ host: "127.0.0.1:3000" }, false],
    [{ host: "[::1]:3000" }, false],
    [{ host: "shop.example.com" }, true],
    [{ host: "localhost:3000", "x-forwarded-proto": "https" }, true],
    [{ host: "shop.example.com", "x-forwarded-proto": "http" }, false],
    [{}, true],
  ])("F01_SecureFlag_%j_%s", (headers, expected) => {
    expect(isSecureRequest(h(headers))).toBe(expected);
  });
});
