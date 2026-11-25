import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell, AuthShellSkeleton } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <RegisterContent searchParams={props.searchParams} />
    </Suspense>
  );
}

async function RegisterContent({
  searchParams,
}: {
  searchParams: PageProps<"/register">["searchParams"];
}) {
  const params = await searchParams;
  const returnUrl = safeReturnUrl(firstParam(params.returnUrl), "");
  if (await getCurrentUser()) redirect(returnUrl || "/account");

  return (
    <AuthShell
      title="Create your account"
      description="Shop faster, track orders and save your details."
    >
      <RegisterForm returnUrl={returnUrl || undefined} />
    </AuthShell>
  );
}
