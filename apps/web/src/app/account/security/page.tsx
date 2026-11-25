import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@stackshop/ui";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { LogoutForm } from "@/components/auth/logout-form";
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation";
import { SessionsList } from "@/components/auth/sessions-list";
import { refreshUrl } from "@/lib/auth/return-url";
import { createAuthedApi } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div className="grid gap-6">
      <Section
        title="Change password"
        description="Use a strong password you do not use elsewhere."
      >
        <ChangePasswordForm />
      </Section>
      <Suspense fallback={<Skeleton />}>
        <EmailAndSessions />
      </Suspense>
      <Section title="Log out" description="End your session on this device or everywhere.">
        <div className="flex flex-wrap gap-3">
          <LogoutForm />
          <LogoutForm allDevices variant="destructive" />
        </div>
      </Section>
    </div>
  );
}

function Skeleton() {
  return <div className="h-48 animate-pulse rounded-xl border bg-muted/40" aria-busy="true" />;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg leading-none font-semibold">{title}</h2>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

async function EmailAndSessions() {
  await connection();
  const api = createAuthedApi();
  let me, sessions;
  try {
    [me, sessions] = await Promise.all([
      api.GET("/api/v1/users/me"),
      api.GET("/api/v1/users/me/sessions"),
    ]);
  } catch {
    return (
      <Section title="Active sessions">
        <p role="alert" className="text-sm">
          We could not load your sessions right now. Please refresh the page.
        </p>
      </Section>
    );
  }
  if (me.response.status === 401 || sessions.response.status === 401) {
    redirect(refreshUrl("/account/security"));
  }

  return (
    <>
      {me.data && !me.data.emailConfirmed && (
        <Section
          title="Confirm your email"
          description="Your email address has not been confirmed yet."
        >
          <ResendConfirmationButton returnPath="/account/security" />
        </Section>
      )}
      <Section
        title="Active sessions"
        description="Devices where you are signed in. Sign out any you do not recognise."
      >
        {sessions.data ? (
          <SessionsList
            sessions={sessions.data.map((s) => ({
              familyId: s.familyId ?? "",
              userAgent: s.userAgent ?? null,
              ip: s.ip ?? null,
              startedAt: s.startedAt ?? "",
              lastUsedAt: s.lastUsedAt ?? "",
            }))}
          />
        ) : (
          <p role="alert" className="text-sm">
            We could not load your sessions right now.
          </p>
        )}
      </Section>
    </>
  );
}
