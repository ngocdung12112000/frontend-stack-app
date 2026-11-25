import { describe, expect, it } from "vitest";
import { fromProblem, mapFieldErrors, parseRetryAfter, SESSION_EXPIRED } from "./problem";

const res = (status: number, headers: Record<string, string> = {}) => ({
  status,
  headers: new Headers(headers),
});

describe("fromProblem", () => {
  it.each([
    ["IDENTITY_EMAIL_TAKEN", 409, /already exists/i],
    ["IDENTITY_INVALID_CREDENTIALS", 401, /incorrect email or password/i],
    ["IDENTITY_LOCKED_OUT", 423, /locked/i],
    ["IDENTITY_TOKEN_INVALID", 400, /invalid or has expired/i],
    ["IDENTITY_INVALID_CURRENT_PASSWORD", 400, /current password is incorrect/i],
  ])("F01_ErrorCode_%s_MapsToFriendlyMessage", (code, status, pattern) => {
    const failure = fromProblem({ code, detail: "SECRET STACK TRACE", status }, res(status));
    expect(failure.formError).toMatch(pattern);
    expect(failure.formError).not.toContain("SECRET");
    expect(failure.code).toBe(code);
  });

  it("F01_AC3_TooManyAttempts_UsesRetryAfterHeader", () => {
    const failure = fromProblem(
      { code: "IDENTITY_TOO_MANY_ATTEMPTS" },
      res(429, { "retry-after": "900" }),
    );
    expect(failure.retryAfterSeconds).toBe(900);
    expect(failure.formError).toContain("15 minutes");
  });

  it("F01_ValidationFailed_MapsErrorsToLowerCamelFields", () => {
    const failure = fromProblem(
      {
        code: "IDENTITY_VALIDATION_FAILED",
        errors: { Email: ["Email is invalid"], FullName: ["Name too long"] },
      },
      res(400),
    );
    expect(failure.fieldErrors).toEqual({
      email: ["Email is invalid"],
      fullName: ["Name too long"],
    });
  });

  it("F01_WeakPassword_UsesOwnCopyOnTheAliasedField", () => {
    const failure = fromProblem(
      { code: "IDENTITY_WEAK_PASSWORD", errors: { password: ["raw server text"] } },
      res(400),
      { fieldAliases: { password: "newPassword" } },
    );
    expect(failure.fieldErrors?.newPassword?.[0]).toMatch(/at least 8 characters/i);
    expect(JSON.stringify(failure)).not.toContain("raw server text");
  });

  it("F01_UnknownCode_FallsBackToGenericMessage", () => {
    const failure = fromProblem({ code: "SOMETHING_NEW", detail: "boom" }, res(500));
    expect(failure.formError).toBe("Something went wrong. Please try again.");
  });

  it("F01_Unauthorized_WithoutCode_IsSessionExpired", () => {
    expect(fromProblem(undefined, res(401)).code).toBe(SESSION_EXPIRED);
    expect(fromProblem("", res(401)).code).toBe(SESSION_EXPIRED);
  });

  it("F01_RetryAfter_IgnoresInvalidValues", () => {
    expect(parseRetryAfter("abc")).toBeUndefined();
    expect(parseRetryAfter("-5")).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it("F01_MapFieldErrors_AppliesAliasesAndIgnoresJunk", () => {
    expect(mapFieldErrors({ Password: ["x"] }, { password: "newPassword" })).toEqual({
      newPassword: ["x"],
    });
    expect(mapFieldErrors(null)).toBeUndefined();
    expect(mapFieldErrors({ a: [] })).toBeUndefined();
  });
});
