import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/account/security/actions", () => ({
  resendConfirmationAction: vi.fn(),
  changePasswordAction: vi.fn(),
  revokeSessionAction: vi.fn(),
}));

import { initialsOf, UserMenuView } from "./user-menu-view";
import { VerifyEmailBannerView } from "./verify-email-banner";

describe("UserMenuView", () => {
  it("F01_US02_Guest_ShowsLoginAndRegisterLinks", () => {
    render(<UserMenuView user={null} />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/register");
  });

  it("F01_US02_SignedIn_ShowsAvatarInitialsAndMenuWithLogoutPost", async () => {
    const user = userEvent.setup();
    render(<UserMenuView user={{ fullName: "Ada Lovelace", email: "ada@example.com" }} />);
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: /account menu for ada lovelace/i });
    expect(trigger).toHaveTextContent("AL");
    await user.click(trigger);
    expect(await screen.findByRole("menuitem", { name: /my account/i })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.getByRole("menuitem", { name: /security/i })).toHaveAttribute(
      "href",
      "/account/security",
    );
    const logout = screen.getByRole("menuitem", { name: /log out/i });
    const form = logout.closest("form");
    expect(form).toHaveAttribute("action", "/api/auth/logout");
    expect(form).toHaveAttribute("method", "post");
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("F01_Initials_FallBackToEmailWhenNameMissing", () => {
    expect(initialsOf({ fullName: "", email: "zed@example.com" })).toBe("ZE");
    expect(initialsOf({ fullName: "Mary Jane Watson", email: "m@x.co" })).toBe("MW");
  });
});

describe("VerifyEmailBannerView", () => {
  it("F01_BR04_BannerAsksUserToConfirmEmailAndOffersResend", () => {
    render(<VerifyEmailBannerView email="ada@example.com" />);
    const region = screen.getByRole("region", { name: "Confirm your email" });
    expect(region).toHaveTextContent("ada@example.com");
    expect(screen.getByRole("button", { name: "Resend confirmation email" })).toBeInTheDocument();
  });
});
