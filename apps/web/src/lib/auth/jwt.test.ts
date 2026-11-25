import { describe, expect, it } from "vitest";
import { makeJwt } from "@/mocks/jwt";
import { decodeJwtPayload, getTokenExpiry, userFromToken } from "./jwt";
import { isStaff } from "./roles";

describe("jwt decoding", () => {
  it("F01_AC6_DecodesClaimsWithoutVerifying", () => {
    const token = makeJwt({ name: "Zoe Mueller", role: ["Admin", "Support"], perm: "users:read" });
    const user = userFromToken(token);
    expect(user).toMatchObject({
      email: "ada@example.com",
      fullName: "Zoe Mueller",
      emailVerified: true,
      roles: ["Admin", "Support"],
      permissions: ["users:read"],
    });
  });

  it("F01_DecodesUtf8Names", () => {
    expect(userFromToken(makeJwt({ name: "Nguyễn Văn An" }))?.fullName).toBe(
      "Nguyễn Văn An",
    );
  });

  it("F01_BR04_EmailVerifiedClaim_AcceptsBooleanAndString", () => {
    expect(userFromToken(makeJwt({ email_verified: false }))?.emailVerified).toBe(false);
    expect(userFromToken(makeJwt({ email_verified: "False" }))?.emailVerified).toBe(false);
    expect(userFromToken(makeJwt({ email_verified: "true" }))?.emailVerified).toBe(true);
  });

  it("F01_SingleRoleClaim_IsNormalisedToArray", () => {
    expect(userFromToken(makeJwt({ role: "Customer" }))?.roles).toEqual(["Customer"]);
  });

  it.each(["", "abc", "a.b", "a.%%%.c", "a.bm90anNvbg.c"])(
    "F01_MalformedToken_%j_ReturnsNull",
    (token) => {
      expect(decodeJwtPayload(token)).toBeNull();
      expect(userFromToken(token)).toBeNull();
      expect(getTokenExpiry(token)).toBeNull();
    },
  );

  it("F01_GetTokenExpiry_ReturnsExp", () => {
    const exp = Math.floor(Date.now() / 1000) + 100;
    expect(getTokenExpiry(makeJwt({ exp }))).toBe(exp);
  });
});

describe("isStaff", () => {
  it("F01_AC8_IsStaff_OnlyForAdminOrSupport", () => {
    expect(isStaff({ roles: ["Admin"] })).toBe(true);
    expect(isStaff({ roles: ["Customer", "Support"] })).toBe(true);
    expect(isStaff({ roles: ["Customer"] })).toBe(false);
    expect(isStaff({ roles: [] })).toBe(false);
    expect(isStaff(null)).toBe(false);
  });
});
