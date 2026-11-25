import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert, AlertDescription, Button } from "@stackshop/ui";
import { AuthShell, AuthShellSkeleton } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <ResetPasswordContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: PageProps<"/reset-password">["searchParams"];
}) {
  const params = await searchParams;
  const token = firstParam(params.token);
  const email = firstParam(params.email);

  if (!token || !email) {
    return (
      <AuthShell title="Reset password">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>This reset link is invalid or incomplete.</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password">
      <ResetPasswordForm email={email} token={token} />
    </AuthShell>
  );
}
