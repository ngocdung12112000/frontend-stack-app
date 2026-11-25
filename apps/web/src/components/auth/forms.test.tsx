import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  forgot: vi.fn(),
  reset: vi.fn(),
  confirm: vi.fn(),
  change: vi.fn(),
}));
const push = vi.hoisted(() => vi.fn());

vi.mock("@/app/(auth)/login/actions", () => ({ loginAction: actions.login }));
vi.mock("@/app/(auth)/register/actions", () => ({ registerAction: actions.register }));
vi.mock("@/app/(auth)/forgot-password/actions", () => ({ forgotPasswordAction: actions.forgot }));
vi.mock("@/app/(auth)/reset-password/actions", () => ({ resetPasswordAction: actions.reset }));
vi.mock("@/app/(auth)/verify-email/actions", () => ({ confirmEmailAction: actions.confirm }));
vi.mock("@/app/account/security/actions", () => ({
  changePasswordAction: actions.change,
  resendConfirmationAction: vi.fn(),
  revokeSessionAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/account",
}));

import { ChangePasswordForm } from "./change-password-form";
import { ForgotPasswordForm, FORGOT_PASSWORD_MESSAGE } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { ResetPasswordForm } from "./reset-password-form";
import { VerifyEmailStatus } from "./verify-email-status";

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset());
  push.mockReset();
});

describe("LoginForm", () => {
  it("F01_AC1_ShowsClientValidationAndDoesNotCallAction", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(actions.login).not.toHaveBeenCalled();
  });

  it("F01_AC1_SubmitsCredentialsAndReturnUrlToAction", async () => {
    actions.login.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    render(<LoginForm returnUrl="/checkout" />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() =>
      expect(actions.login).toHaveBeenCalledWith(
        { email: "ada@example.com", password: "Passw0rd!" },
        "/checkout",
      ),
    );
  });

  it("F01_AC3_ShowsMappedServerErrorInAlert", async () => {
    actions.login.mockResolvedValue({
      ok: false,
      code: "IDENTITY_LOCKED_OUT",
      formError: "Your account is temporarily locked.",
    });
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "x");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("temporarily locked");
  });

  it("F01_LoginForm_PreservesReturnUrlInRegisterLink", () => {
    render(<LoginForm returnUrl="/checkout" />);
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register?returnUrl=%2Fcheckout",
    );
  });
});

describe("RegisterForm", () => {
  it("F01_AC2_ApplesServerFieldErrorToField", async () => {
    actions.register.mockResolvedValue({
      ok: false,
      code: "IDENTITY_VALIDATION_FAILED",
      formError: "Please check the highlighted fields and try again.",
      fieldErrors: { email: ["Email is already registered"] },
    });
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Full name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Email is already registered")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("F01_BR02_EnforcesPasswordPolicyBeforeSubmitting", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Full name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "abcdefgh");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Password must contain at least one number")).toBeInTheDocument();
    expect(actions.register).not.toHaveBeenCalled();
  });
});

describe("ForgotPasswordForm", () => {
  it("F01_AC7_ShowsTheSameMessageAfterSubmit", async () => {
    actions.forgot.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText("Email"), "ghost@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(FORGOT_PASSWORD_MESSAGE)).toBeInTheDocument();
    expect(FORGOT_PASSWORD_MESSAGE).toMatch(/if an account exists/i);
  });
});

describe("ResetPasswordForm", () => {
  it("F01_Reset_SubmitsTokenAndEmailThenGoesToLogin", async () => {
    actions.reset.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ResetPasswordForm email="ada@example.com" token="tok123" />);
    await user.type(screen.getByLabelText("New password"), "Passw0rd!");
    await user.type(screen.getByLabelText("Confirm new password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Set new password" }));
    await waitFor(() =>
      expect(actions.reset).toHaveBeenCalledWith({
        email: "ada@example.com",
        token: "tok123",
        newPassword: "Passw0rd!",
        confirmPassword: "Passw0rd!",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?reset=1"));
  });

  it("F01_Reset_InvalidToken_ShowsFriendlyError", async () => {
    actions.reset.mockResolvedValue({
      ok: false,
      code: "IDENTITY_TOKEN_INVALID",
      formError: "This link is invalid or has expired. Please request a new one.",
    });
    const user = userEvent.setup();
    render(<ResetPasswordForm email="ada@example.com" token="bad" />);
    await user.type(screen.getByLabelText("New password"), "Passw0rd!");
    await user.type(screen.getByLabelText("Confirm new password"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Set new password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid or has expired/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("F01_Reset_MismatchedPasswords_BlockedClientSide", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm email="ada@example.com" token="tok" />);
    await user.type(screen.getByLabelText("New password"), "Passw0rd!");
    await user.type(screen.getByLabelText("Confirm new password"), "Other1234");
    await user.click(screen.getByRole("button", { name: "Set new password" }));
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(actions.reset).not.toHaveBeenCalled();
  });
});

describe("ChangePasswordForm", () => {
  it("F01_US06_WrongCurrentPassword_ShownOnField", async () => {
    actions.change.mockResolvedValue({
      ok: false,
      code: "IDENTITY_INVALID_CURRENT_PASSWORD",
      formError: "Your current password is incorrect.",
    });
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    await user.type(screen.getByLabelText("Current password"), "Wrong1234");
    await user.type(screen.getByLabelText("New password"), "Another1pw");
    await user.type(screen.getByLabelText("Confirm new password"), "Another1pw");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("current password is incorrect");
  });

  it("F01_US06_Success_ShowsConfirmation", async () => {
    actions.change.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    await user.type(screen.getByLabelText("Current password"), "Passw0rd!");
    await user.type(screen.getByLabelText("New password"), "Another1pw");
    await user.type(screen.getByLabelText("Confirm new password"), "Another1pw");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Your password has been changed.")).toBeInTheDocument();
  });
});

describe("VerifyEmailStatus", () => {
  const props = { userId: "0197a2b0-0000-7000-8000-000000000001", token: "tok" };

  it("F01_AC1_ConfirmsOnceOnMount_AndShowsSuccess", async () => {
    actions.confirm.mockResolvedValue({ ok: true });
    render(<VerifyEmailStatus {...props} />);
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(actions.confirm).toHaveBeenCalledTimes(1);
    expect(actions.confirm).toHaveBeenCalledWith(props);
  });

  it("F01_ConfirmEmail_InvalidToken_ShowsError", async () => {
    actions.confirm.mockResolvedValue({
      ok: false,
      formError: "This link is invalid or has expired. Please request a new one.",
    });
    render(<VerifyEmailStatus {...props} />);
    expect(await screen.findByText("Confirmation failed")).toBeInTheDocument();
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
  });
});
