import { Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@stackshop/ui";
import { mainNav, siteConfig } from "@/lib/site";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <MobileNav />
        <Link
          href="/"
          className="rounded-md text-lg font-bold tracking-tight focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {siteConfig.name}
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Placeholder: real search (F05) replaces this. */}
        <div role="search" className="relative ml-auto hidden w-full max-w-sm sm:block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            disabled
            aria-label="Search products"
            placeholder="Search products (coming soon)"
            className="h-9 w-full rounded-md border bg-background pr-3 pl-9 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Button variant="ghost" size="icon" className="sm:hidden" disabled aria-label="Search">
            <Search className="size-5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart" aria-label="Cart, 0 items">
              <ShoppingCart className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
