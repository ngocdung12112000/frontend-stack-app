"use client";

import { LogOut, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@stackshop/ui";

export type MenuUser = { fullName: string; email: string };

export function initialsOf(user: MenuUser): string {
  const source = user.fullName.trim() || user.email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "?";
  const last = parts[parts.length - 1] ?? first;
  const letters = parts.length > 1 ? first.charAt(0) + last.charAt(0) : first.slice(0, 2);
  return letters.toUpperCase();
}

export function GuestActions() {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">Log in</Link>
      </Button>
      <Button size="sm" asChild className="hidden sm:inline-flex">
        <Link href="/register">Sign up</Link>
      </Button>
    </div>
  );
}

export function UserMenuView({ user }: { user: MenuUser | null }) {
  if (!user) return <GuestActions />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Account menu for ${user.fullName || user.email}`}>
          <Avatar>
            <AvatarFallback>{initialsOf(user)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.fullName || "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User aria-hidden="true" /> My account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/security">
            <ShieldCheck aria-hidden="true" /> Security
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action="/api/auth/logout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-default">
              <LogOut aria-hidden="true" /> Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
