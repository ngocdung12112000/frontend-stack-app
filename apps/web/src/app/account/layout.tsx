import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountNav } from "@/components/account/account-nav";

export const metadata: Metadata = {
  title: { default: "My account", template: "%s | My account | StackShop" },
  robots: { index: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="sr-only">My account</h1>
      <AccountNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
