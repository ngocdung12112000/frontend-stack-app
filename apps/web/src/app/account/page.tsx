import { BadgeCheck, MailWarning } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@stackshop/ui";
import { LogoutForm } from "@/components/auth/logout-form";
import { refreshUrl } from "@/lib/auth/return-url";
import { createAuthedApi } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile" };

export default function AccountPage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile />
    </Suspense>
  );
}

function ProfileSkeleton() {
  return <div className="h-64 animate-pulse rounded-xl border bg-muted/40" aria-busy="true" />;
}

async function Profile() {
  // Request-time data first: the API client generates random ids, which Next only allows after it.
  await connection();
  let result;
  try {
    result = await createAuthedApi().GET("/api/v1/users/me");
  } catch {
    return <ProfileError />;
  }
  // The proxy normally refreshes first; a 401 here means the token died mid-request.
  if (result.response.status === 401) redirect(refreshUrl("/account"));
  if (!result.data) return <ProfileError />;
  const me = result.data;

  const rows: [string, string][] = [
    ["Name", me.fullName || "Not set"],
    ["Email", me.email ?? ""],
    ["Phone", me.phone || "Not set"],
    ["Roles", (me.roles ?? []).join(", ") || "Customer"],
    [
      "Member since",
      me.createdAt
        ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(me.createdAt))
        : "",
    ],
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl leading-none font-semibold">Profile</h2>
        <CardDescription className="flex items-center gap-2">
          {me.emailConfirmed ? (
            <>
              <BadgeCheck className="size-4 text-emerald-600" aria-hidden="true" /> Email confirmed
            </>
          ) : (
            <>
              <MailWarning className="size-4 text-amber-600" aria-hidden="true" /> Email not
              confirmed yet
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-sm font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <LogoutForm className="w-fit" />
      </CardContent>
    </Card>
  );
}

function ProfileError() {
  return (
    <Card>
      <CardContent role="alert">
        We could not load your profile right now. Please refresh the page to try again.
      </CardContent>
    </Card>
  );
}
