import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@stackshop/ui";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <h1 className="text-2xl leading-none font-semibold">{title}</h1>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-4">{children}</CardContent>
      </Card>
    </div>
  );
}

export function AuthShellSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16" aria-busy="true">
      <div className="h-80 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  );
}
