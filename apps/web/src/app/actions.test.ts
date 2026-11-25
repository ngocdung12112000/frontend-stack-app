// @vitest-environment node
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeJwt } from "@/mocks/jwt";
import { problem } from "@/mocks/handlers";
import { server } from "@/mocks/server";

const jar = vi.hoisted(() => ({ store: new Map<string, string>(), set: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: jar.set,
    get: (name: string) => (jar.store.has(name) ? { value: jar.store.get(name) } : undefined),
  }),
  headers: async () => new Headers({ host: "localhost:3000" }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { forgotPasswordAction } from "./(auth)/forgot-password/actions";
import { loginAction } from "./(auth)/login/actions";
import { registerAction } from "./(auth)/register/actions";
import { resetPasswordAction } from "./(auth)/reset-password/actions";
import { confirmEmailAction } from "./(auth)/verify-email/actions";
import {
  changePasswordAction,
  resendConfirmationAction,
  revokeSessionAction,
} from "./account/security/actions";

const base = process.env.API_BASE_URL || "http://localhost:5000";
const api = (path: string) => `${base}/api/v1${path}`;
const validLogin = { email: "ada@example.com", password: "Passw0rd!" };

beforeEach(() => {
  jar.store.clear();
  jar.set.mockClear();
});

describe("loginAction", () => {
  it("F01_AC1_Success_SetsCookiesAndRedirectsToReturnUrl", async () => {
    await expect(loginAction(validLogin, "/checkout")).rejects.toThrow("NEXT_REDIRECT:/checkout");
    const names = jar.set.mock.calls.map((c) => c[0]);
    expect(names).toEqual(["at", "rt"]);
    expect(jar.set.mock.calls[1]?.[2]).toMatchObject({ path: "/api/auth", sameSite: "strict" });
  });

  it("F01_Login_DefaultsToAccount_AndRejectsOpenRedirect", async () => {
    await expect(loginAction(validLogin, "https://evil.example")).rejects.toThrow(
      "NEXT_REDIRECT:/account",
    );
  });

  it("F01_ServerValidation_RejectsBadInputWithoutCallingApi", async () => {
    server.use(
      http.post(api("/auth/login"), () => {
        throw new Error("must not be called");
      }),
    );
    const result = await loginAction({ email: "nope", password: "" });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toHaveProperty("email");
    expect(result.fieldErrors).toHaveProperty("password");
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("F01_InvalidCredentials_ShowsFriendlyMessage_NoCookies", async () => {
    server.use(http.post(api("/auth/login"), () => problem(401, "IDENTITY_INVALID_CREDENTIALS")));
    const result = await loginAction(validLogin);
    expect(result.formError).toBe("Incorrect email or password.");
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("F01_AC3_LockedOut_423", async () => {
    server.use(http.post(api("/auth/login"), () => problem(423, "IDENTITY_LOCKED_OUT")));
    const result = await loginAction(validLogin);
    expect(result.code).toBe("IDENTITY_LOCKED_OUT");
    expect(result.formError).toMatch(/locked/i);
  });

  it("F01_TooManyAttempts_429_ShowsRetryAfter", async () => {
    server.use(
      http.post(api("/auth/login"), () =>
        HttpResponse.json(
          { code: "IDENTITY_TOO_MANY_ATTEMPTS", status: 429 },
          { status: 429, headers: { "Retry-After": "120" } },
        ),
      ),
    );
    const result = await loginAction(validLogin);
    expect(result.retryAfterSeconds).toBe(120);
    expect(result.formError).toContain("2 minutes");
  });

  it("F01_NetworkError_ReturnsFriendlyFailure", async () => {
    server.use(http.post(api("/auth/login"), () => HttpResponse.error()));
    const result = await loginAction(validLogin);
    expect(result.code).toBe("NETWORK_ERROR");
  });
});

describe("registerAction", () => {
  const input = { fullName: "Ada", email: "ada@example.com", password: "Passw0rd!" };

  it("F01_AC1_Register_ThenLogsIn_AndRedirects", async () => {
    await expect(registerAction(input)).rejects.toThrow("NEXT_REDIRECT:/account");
    expect(jar.set.mock.calls.map((c) => c[0])).toEqual(["at", "rt"]);
  });

  it("F01_AC2_EmailTaken_409_MapsToMessage", async () => {
    server.use(http.post(api("/auth/register"), () => problem(409, "IDENTITY_EMAIL_TAKEN")));
    const result = await registerAction(input);
    expect(result.code).toBe("IDENTITY_EMAIL_TAKEN");
    expect(result.formError).toMatch(/already exists/i);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("F01_WeakPassword_FromServer_LandsOnPasswordField", async () => {
    server.use(
      http.post(api("/auth/register"), () =>
        problem(400, "IDENTITY_WEAK_PASSWORD", { errors: { password: ["too weak"] } }),
      ),
    );
    const result = await registerAction(input);
    expect(result.fieldErrors?.password?.[0]).toMatch(/at least 8/i);
  });

  it("F01_ValidationFailed_FieldErrorsFromProblemDetails", async () => {
    server.use(
      http.post(api("/auth/register"), () =>
        problem(400, "IDENTITY_VALIDATION_FAILED", { errors: { FullName: ["Too long"] } }),
      ),
    );
    const result = await registerAction(input);
    expect(result.fieldErrors).toEqual({ fullName: ["Too long"] });
  });

  it("F01_Register_ClientSideBypass_IsRevalidatedOnServer", async () => {
    const result = await registerAction({ ...input, password: "short" });
    expect(result.fieldErrors).toHaveProperty("password");
  });
});

describe("forgotPasswordAction", () => {
  it("F01_AC7_SameResponse_ForExistingAndUnknownEmail", async () => {
    server.use(
      http.post(api("/auth/forgot-password"), async ({ request }) => {
        const { email } = (await request.json()) as { email: string };
        return email.startsWith("known") ? new HttpResponse(null, { status: 202 }) : problem(500, "X");
      }),
    );
    const known = await forgotPasswordAction({ email: "known@example.com" });
    const unknown = await forgotPasswordAction({ email: "ghost@example.com" });
    expect(known).toEqual({ ok: true });
    expect(unknown).toEqual(known);
  });

  it("F01_AC7_SameResponse_EvenWhenApiIsDown", async () => {
    server.use(http.post(api("/auth/forgot-password"), () => HttpResponse.error()));
    expect(await forgotPasswordAction({ email: "a@b.co" })).toEqual({ ok: true });
  });
});

describe("resetPasswordAction", () => {
  const input = {
    email: "ada@example.com",
    token: "tok",
    newPassword: "Passw0rd!",
    confirmPassword: "Passw0rd!",
  };

  it("F01_Reset_Success", async () => {
    expect(await resetPasswordAction(input)).toEqual({ ok: true });
  });

  it("F01_Reset_TokenInvalid_400", async () => {
    server.use(http.post(api("/auth/reset-password"), () => problem(400, "IDENTITY_TOKEN_INVALID")));
    const result = await resetPasswordAction(input);
    expect(result.ok).toBe(false);
    expect(result.formError).toMatch(/invalid or has expired/i);
  });

  it("F01_Reset_WeakPassword_MapsToNewPasswordField", async () => {
    server.use(
      http.post(api("/auth/reset-password"), () =>
        problem(400, "IDENTITY_WEAK_PASSWORD", { errors: { password: ["x"] } }),
      ),
    );
    const result = await resetPasswordAction(input);
    expect(result.fieldErrors).toHaveProperty("newPassword");
  });

  it("F01_Reset_MismatchedConfirmation_RejectedOnServer", async () => {
    const result = await resetPasswordAction({ ...input, confirmPassword: "Different1" });
    expect(result.fieldErrors).toHaveProperty("confirmPassword");
  });
});

describe("confirmEmailAction", () => {
  const input = { userId: "0197a2b0-0000-7000-8000-000000000001", token: "tok" };

  it("F01_AC1_ConfirmEmail_Success", async () => {
    expect(await confirmEmailAction(input)).toEqual({ ok: true });
  });

  it("F01_ConfirmEmail_TokenInvalid", async () => {
    server.use(http.post(api("/auth/confirm-email"), () => problem(400, "IDENTITY_TOKEN_INVALID")));
    const result = await confirmEmailAction(input);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("IDENTITY_TOKEN_INVALID");
  });

  it("F01_ConfirmEmail_GarbageIdentifiers_NeverReachApi", async () => {
    const result = await confirmEmailAction({ userId: "x", token: "" });
    expect(result.ok).toBe(false);
  });
});

describe("account security actions", () => {
  const goodChange = {
    currentPassword: "Passw0rd!",
    newPassword: "Another1pw",
    confirmPassword: "Another1pw",
  };

  it("F01_ChangePassword_SendsBearerFromAtCookie", async () => {
    const at = makeJwt();
    jar.store.set("at", at);
    let auth: string | null = null;
    server.use(
      http.post(api("/auth/change-password"), ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    expect(await changePasswordAction(goodChange)).toEqual({ ok: true });
    expect(auth).toBe(`Bearer ${at}`);
  });

  it("F01_ChangePassword_WrongCurrent_400_IsFormErrorNotSessionExpiry", async () => {
    jar.store.set("at", makeJwt());
    server.use(
      http.post(api("/auth/change-password"), () =>
        problem(400, "IDENTITY_INVALID_CURRENT_PASSWORD"),
      ),
    );
    const result = await changePasswordAction(goodChange);
    expect(result.code).toBe("IDENTITY_INVALID_CURRENT_PASSWORD");
    expect(result.formError).toMatch(/current password is incorrect/i);
  });

  it("F01_AC6_ExpiredAccessToken_401_ReturnsSessionExpiredSoClientCanRefresh", async () => {
    jar.store.set("at", makeJwt({ expiresInSeconds: -5 }));
    server.use(
      http.post(api("/auth/change-password"), () => new HttpResponse(null, { status: 401 })),
    );
    const result = await changePasswordAction(goodChange);
    expect(result.code).toBe("SESSION_EXPIRED");
  });

  it("F01_NoAtCookie_ActionsReturnSessionExpired", async () => {
    expect((await resendConfirmationAction()).code).toBe("SESSION_EXPIRED");
    expect((await revokeSessionAction("0197a2b0-0000-7000-8000-0000000000a1")).code).toBe(
      "SESSION_EXPIRED",
    );
  });

  it("F01_RevokeSession_CallsDeleteForFamily", async () => {
    jar.store.set("at", makeJwt());
    let called: string | undefined;
    server.use(
      http.delete(api("/users/me/sessions/:familyId"), ({ params }) => {
        called = String(params.familyId);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const id = "0197a2b0-0000-7000-8000-0000000000a1";
    expect(await revokeSessionAction(id)).toEqual({ ok: true });
    expect(called).toBe(id);
  });

  it("F01_RevokeSession_RejectsNonUuid", async () => {
    jar.store.set("at", makeJwt());
    expect((await revokeSessionAction("../../x")).ok).toBe(false);
  });

  it("F01_ResendConfirmation_Success", async () => {
    jar.store.set("at", makeJwt());
    expect(await resendConfirmationAction()).toEqual({ ok: true });
  });
});
