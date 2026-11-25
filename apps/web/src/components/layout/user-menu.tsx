import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { GuestActions, UserMenuView } from "./user-menu-view";

async function CurrentUserMenu() {
  const user = await getCurrentUser();
  return <UserMenuView user={user ? { fullName: user.fullName, email: user.email } : null} />;
}

/**
 * Reads the session cookie, which is request-time data under cacheComponents, so it streams
 * in behind Suspense and the rest of the header stays in the static shell.
 */
export function UserMenu() {
  return (
    <Suspense
      fallback={
        <div
          className="size-9 animate-pulse rounded-full bg-muted"
          role="status"
          aria-label="Loading account"
        />
      }
    >
      <CurrentUserMenu />
    </Suspense>
  );
}

export { GuestActions };
