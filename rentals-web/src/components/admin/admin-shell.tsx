"use client";

import {
  CalendarCheck,
  CarFront,
  ClipboardList,
  LogOut,
  Menu,
  Settings,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/cn";

/**
 * The office's own chrome.
 *
 * Deliberately not the customer site's header. This is a tool somebody has
 * open all day, so it is denser, it puts navigation down the side where it
 * does not eat the page, and it never advertises anything.
 */
const NAV = [
  { href: "/admin", label: "Bookings", icon: ClipboardList, exact: true },
  { href: "/admin/cars", label: "Cars", icon: CarFront },
  { href: "/admin/listings", label: "Partner cars", icon: CalendarCheck },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/drivers", label: "Drivers", icon: UsersRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export const AdminShell = ({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-paper-deep">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-lg p-1.5 text-ink hover:bg-ink/5"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <span className="font-display text-lg font-semibold text-forest">Musafir</span>
        <span className="ms-auto text-xs text-muted">{name}</span>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside
          className={cn(
            "w-60 shrink-0 border-e border-line bg-paper lg:block lg:min-h-screen",
            open ? "block" : "hidden",
          )}
        >
          <div className="sticky top-0 flex h-screen flex-col p-4">
            <Link href="/admin" className="hidden items-baseline gap-2 px-2 py-2 lg:flex">
              <span className="font-display text-xl font-semibold text-forest">Musafir</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brass">
                Office
              </span>
            </Link>

            <nav className="mt-4 space-y-0.5" aria-label="Admin">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                      active ? "bg-forest text-paper" : "text-ink-soft hover:bg-ink/5",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-1 border-t border-line pt-3">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/5"
              >
                <CarFront className="size-4 shrink-0" aria-hidden />
                View the website
              </Link>
              <p className="px-3 pt-2 text-xs text-muted">{name}</p>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/5"
              >
                <LogOut className="size-4 shrink-0" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* A div, not a <main>: the root layout already provides the
            document's one main landmark, and nesting a second confuses
            every screen reader that offers "skip to main content". */}
        <div className="min-w-0 flex-1 px-5 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
};
