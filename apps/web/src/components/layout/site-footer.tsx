import Link from "next/link";
import { Separator } from "@stackshop/ui";
import { mainNav, siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <p className="text-lg font-bold tracking-tight">{siteConfig.name}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A learning e-commerce platform built to exercise a modern full stack.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="w-fit text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <Separator className="my-6" />
        <p className="text-xs text-muted-foreground">
          &copy; {siteConfig.name}. For learning purposes only.
        </p>
      </div>
    </footer>
  );
}
