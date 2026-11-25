import { Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Alert, AlertDescription } from "@stackshop/ui";
import { AuthShell, AuthShellSkeleton } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Log in" };

const NOTICES: Record<string, string> = {
  reset: "Your password has been updated. Log in with the new password.",
  registered: "Your account was created. Log in to continue.",
  unavailable: "We could not refresh your session because the service is unavailable. Please try again.",
};

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <LoginContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const returnUrl = safeReturnUrl(firstParam(params.returnUrl), "");

  // Already signed in (valid access token): nothing to do here.
  if (await getCurrentUser()) redirect(returnUrl || "/account");

  const notice = firstParam(params.reset)
    ? NOTICES.reset
    : firstParam(params.registered)
      ? NOTICES.registered
      : firstParam(params.notice) === "unavailable"
        ? NOTICES.unavailable
        : null;

  return (
    <AuthShell title="Log in" description="Welcome back. Log in to your StackShop account.">
      {notice && (
        <Alert variant="default" role="status">
          <Info aria-hidden="true" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <LoginForm returnUrl={returnUrl || undefined} />
    </AuthShell>
  );
}
