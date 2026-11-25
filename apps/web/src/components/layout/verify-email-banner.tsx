import { MailWarning } from "lucide-react";
import { Suspense } from "react";
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation";
import { getCurrentUser } from "@/lib/auth/session";

/** Presentational part, kept separate so it can be tested without cookies. */
export function VerifyEmailBannerView({ email }: { email: string }) {
  return (
    <div
      role="region"
      aria-label="Confirm your email"
      className="border-b border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <MailWarning className="size-4 shrink-0" aria-hidden="true" />
        <p>
          Please confirm your email address. We sent a link to <strong>{email}</strong>.
        </p>
        <ResendConfirmationButton variant="link" />
      </div>
    </div>
  );
}

async function BannerIfUnverified() {
  const user = await getCurrentUser();
  if (!user || user.emailVerified) return null;
  return <VerifyEmailBannerView email={user.email} />;
}

/** BR-04: unconfirmed users can shop, but are reminded until they confirm. */
export function VerifyEmailBanner() {
  return (
    <Suspense fallback={null}>
      <BannerIfUnverified />
    </Suspense>
  );
}
