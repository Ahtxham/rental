"use client";

import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Contact } from "@/lib/config";
import { telHref } from "@/lib/config";
import { cn } from "@/lib/cn";

/**
 * `owners` marks the one link aimed at somebody who is not here to rent.
 *
 * It is set apart rather than sitting in the row as a fifth page, because a
 * link that reads like every other link gets scanned past by the people it is
 * for. Musafir's supply of cars depends on those people finding it.
 */
const LINKS = [
  { href: "/cars", label: "Cars" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/rent-your-car", label: "Earn with your car", owners: true },
];

export const SiteHeader = ({ contact }: { contact: Contact }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  // The admin and the car owner's portal are tools, not the shop window. They
  // get their own chrome and would only confuse a customer looking for a car.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/lender")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5 sm:px-8">
        <Link href="/" className="flex items-baseline gap-2" aria-label="Musafir Rent A Car, home">
          <span className="font-display text-2xl font-semibold text-forest">Musafir</span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-brass sm:block">
            Rent A Car
          </span>
        </Link>

        <nav className="ms-auto hidden items-center gap-7 lg:flex" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors duration-150",
                link.owners
                  ? "rounded-full border border-brass/35 bg-brass-wash px-3.5 py-1.5 text-brass hover:border-brass hover:bg-brass/15"
                  : pathname === link.href
                    ? "text-forest"
                    : "text-ink-soft hover:text-forest",
                link.owners && pathname === link.href && "border-brass bg-brass/15",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* The phone number stays beside the button rather than instead of it:
            plenty of people renting a car in Lahore would rather talk to
            somebody, and losing that costs bookings. On a phone it collapses to
            the icon, because a number and a button fighting for the same 80
            pixels means neither gets tapped. */}
        <a
          href={telHref(contact.phone)}
          className="ms-auto hidden items-center gap-2 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:text-forest xl:inline-flex"
        >
          <Phone className="size-4" aria-hidden />
          <span className="tnum">{contact.phone}</span>
        </a>

        <Link
          href="/book"
          className="ms-auto inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brass-bright xl:ms-4"
        >
          Book a car
        </Link>

        <a
          href={telHref(contact.phone)}
          aria-label={`Call ${contact.phone}`}
          className="hidden size-10 items-center justify-center rounded-full border border-line text-forest transition-colors duration-150 hover:bg-forest hover:text-paper min-[340px]:inline-flex xl:hidden"
        >
          <Phone className="size-4" aria-hidden />
        </a>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-full p-2 text-ink transition-colors duration-150 hover:bg-ink/5 lg:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-line bg-paper px-5 pb-4 lg:hidden" aria-label="Main">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block border-b border-line/60 py-3 text-sm font-medium",
                link.owners ? "text-brass" : "text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/book"
            className="mt-3 block rounded-full bg-brass px-5 py-3 text-center text-sm font-semibold text-white"
          >
            Book a car
          </Link>
        </nav>
      ) : null}
    </header>
  );
};
