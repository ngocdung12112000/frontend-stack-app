import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  confirmEmailSchema,
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth";

describe("auth schemas", () => {
  it("F01_AC1_RegisterSchema_AcceptsValidInput_AndTrimsEmail", () => {
    const parsed = registerSchema.parse({
      fullName: " Ada ",
      email: " ada@example.com ",
      password: "Passw0rd!",
    });
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.fullName).toBe("Ada");
  });

  it.each([
    ["short", "a1"],
    ["no digit", "abcdefgh"],
    ["no letter", "12345678"],
    ["too long", "a1" + "x".repeat(127)],
  ])("F01_BR02_PasswordPolicy_Rejects_%s", (_name, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });

  it("F01_BR02_PasswordPolicy_Accepts8CharsWithLetterAndDigit", () => {
    expect(passwordSchema.safeParse("abcdefg1").success).toBe(true);
    expect(passwordSchema.safeParse("a1" + "x".repeat(126)).success).toBe(true);
  });

  it("F01_AC1_RegisterSchema_RejectsBadEmailAndEmptyName", () => {
    const result = registerSchema.safeParse({ fullName: "", email: "nope", password: "Passw0rd!" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("fullName");
      expect(paths).toContain("email");
    }
  });

  it("F01_LoginSchema_DoesNotEnforcePasswordPolicy", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("F01_AC7_ForgotPasswordSchema_RequiresValidEmail", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "a" }).success).toBe(false);
  });

  it("F01_ResetPasswordSchema_RequiresMatchingPasswords", () => {
    const base = { email: "a@b.co", token: "t", newPassword: "Passw0rd!" };
    expect(resetPasswordSchema.safeParse({ ...base, confirmPassword: "Passw0rd!" }).success).toBe(
      true,
    );
    const bad = resetPasswordSchema.safeParse({ ...base, confirmPassword: "different1" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });

  it("F01_ChangePasswordSchema_RejectsSamePasswordAndMismatch", () => {
    const same = changePasswordSchema.safeParse({
      currentPassword: "Passw0rd!",
      newPassword: "Passw0rd!",
      confirmPassword: "Passw0rd!",
    });
    expect(same.success).toBe(false);
    const ok = changePasswordSchema.safeParse({
      currentPassword: "Passw0rd!",
      newPassword: "Another1pw",
      confirmPassword: "Another1pw",
    });
    expect(ok.success).toBe(true);
  });

  it("F01_AC1_ConfirmEmailSchema_RequiresUuidAndToken", () => {
    expect(
      confirmEmailSchema.safeParse({ userId: "0197a2b0-0000-7000-8000-000000000001", token: "x" })
        .success,
    ).toBe(true);
    expect(confirmEmailSchema.safeParse({ userId: "nope", token: "x" }).success).toBe(false);
  });
});
