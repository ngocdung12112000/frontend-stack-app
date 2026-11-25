import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert, AlertDescription, Button } from "@stackshop/ui";
import { AuthShell, AuthShellSkeleton } from "@/components/auth/auth-shell";
import { VerifyEmailStatus } from "@/components/auth/verify-email-status";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Confirm your email" };

export default function VerifyEmailPage(props: PageProps<"/verify-email">) {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <VerifyEmailContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function VerifyEmailContent({
  searchParams,
}: {
  searchParams: PageProps<"/verify-email">["searchParams"];
}) {
  const params = await searchParams;
  const userId = firstParam(params.userId);
  const token = firstParam(params.token);

  return (
    <AuthShell title="Confirm your email">
      {userId && token ? (
        <VerifyEmailStatus userId={userId} token={token} />
      ) : (
        <>
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>This confirmation link is invalid or incomplete.</AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <Link href="/">Back to the shop</Link>
          </Button>
        </>
      )}
    </AuthShell>
  );
}
