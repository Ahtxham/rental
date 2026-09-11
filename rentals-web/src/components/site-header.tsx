"use client";

import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PressAnchor, PressLink } from "@/components/motion/pressable";
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

/**
 * Chrome that floats over the page rather than taking a strip off the top of it.
 *
 * Two states, and which one it is in depends on what is underneath. Over the
 * hero it is not there at all: no panel, no line, just the words, because the
 * hero is a photograph and putting a bar across the top of a photograph is
 * taking a slice out of it. Once the page proper is underneath, the glass comes
 * in and the content softens as it passes below, which is the honest way to
 * show one surface lying over another. A hard 1px divider claims they are
 * separate regions, and they are not.
 *
 * The swap is driven by an element at the foot of the hero rather than by a
 * scroll position: a number in pixels is a guess about a layout that changes
 * with the viewport, the text size and how long the headline wraps to.
 */
export const SiteHeader = ({ contact }: { contact: Contact }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /**
   * Starts in the state the route is going to need, rather than in one state
   * and correcting itself.
   *
   * The sentinel can only be found after the first paint, so a header that
   * waits to be told flashes the wrong colours over the hero on every load,
   * which is the one moment somebody is definitely looking at it.
   */
  const [onGlass, setOnGlass] = useState(() => pathname !== "/");

  useEffect(() => setOpen(false), [pathname]);

  /**
   * The one line that makes `:active` work on iOS.
   *
   * Safari on iOS only applies `:active` while the document has a touch
   * listener attached, so without this every press state on an iPhone is dead,
   * which is most of the traffic this site will get. The listener does nothing
   * and is passive, so it costs nothing either. It lives here because this
   * component is mounted on every page.
   */
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  useEffect(() => {
    const sentinel = document.getElementById("hero-end");
    if (!sentinel) {
      setOnGlass(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        setOnGlass(!entry.isIntersecting || entry.boundingClientRect.top < 0),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pathname]);

  // The admin and the car owner's portal are tools, not the shop window. They
  // get their own chrome and would only confuse a customer looking for a car.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/lender"))
    return null;

  const dark = !onGlass;

  /**
   * Floating chrome takes no space, so a page without a hero under it has to
   * be given the space back.
   *
   * Decided from the route rather than from whether the sentinel turned up,
   * because the sentinel is only known after the first paint and the page
   * would visibly drop by 68 pixels on load.
   */
  const overlaid = pathname === "/";

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-colors duration-[260ms]",
          onGlass ? "material" : "bg-transparent",
        )}
      >
        {/* Over the hero there is no panel, which leaves the words with whatever
          the photograph happens to put behind them, and what it puts behind
          them changes as the page moves. A short gradient off the top edge
          buys the contrast back without drawing a bar across the picture. It
          is a layer of its own rather than a background on the header, because
          `transition-colors` cannot cross-fade a gradient and the swap would
          arrive as a pop. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-b from-night/65 via-night/25 to-transparent transition-opacity duration-[260ms]",
            onGlass ? "opacity-0" : "opacity-100",
          )}
        />
        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-5 px-5 py-3 sm:px-8">
          <PressLink
            href="/"
            className="flex items-baseline gap-2"
            aria-label="Musafir Rent A Car, home"
          >
            <span
              className={cn(
                "font-display text-[1.375rem] font-semibold tracking-[-0.02em] transition-colors duration-[260ms]",
                dark ? "text-paper" : "text-ink",
              )}
            >
              Musafir
            </span>
            <span
              className={cn(
                "t-eyebrow hidden transition-colors duration-[260ms] sm:block",
                dark ? "text-paper/55" : "text-muted",
              )}
            >
              Rent A Car
            </span>
          </PressLink>

          <nav
            className="ms-auto hidden items-center gap-7 lg:flex"
            aria-label="Main"
          >
            {LINKS.map((link) => (
              <PressLink
                key={link.href}
                href={link.href}
                className={cn(
                  "text-[0.8125rem] font-medium tracking-[0.01em]",
                  link.owners
                    ? cn(
                        "rounded-full border px-3.5 py-1.5",
                        dark
                          ? "border-paper/25 bg-paper/10 text-paper/55"
                          : "border-line bg-paper-deep text-muted hover:border-ink/30",
                      )
                    : dark
                      ? cn(
                          "text-paper/75 hover:text-paper",
                          pathname === link.href && "text-paper",
                        )
                      : cn(
                          "text-ink-soft hover:text-ink",
                          pathname === link.href && "text-ink",
                        ),
                )}
              >
                {link.label}
              </PressLink>
            ))}
          </nav>

          {/* The phone number stays beside the button rather than instead of it:
            plenty of people renting a car in Lahore would rather talk to
            somebody, and losing that costs bookings. On a phone it collapses to
            the icon, because a number and a button fighting for the same 80
            pixels means neither gets tapped. */}
          {/* No number set means no number shown. A placeholder here would be a
            phone number a customer actually dials. */}
          {contact.phone ? (
            <PressAnchor
              href={telHref(contact.phone)}
              className={cn(
                "ms-auto hidden items-center gap-2 text-[0.8125rem] font-semibold xl:inline-flex",
                dark
                  ? "text-paper/80 hover:text-paper"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              <Phone className="size-4" aria-hidden />
              <span className="tnum">{contact.phone}</span>
            </PressAnchor>
          ) : null}

          <PressLink
            href="/book"
            className={cn(
              "ms-auto inline-flex items-center gap-2 rounded-full px-5 py-2 text-[0.8125rem] font-semibold",
              // The accent, at whichever of its two values the surface can
              // carry. Same colour, same meaning, legible on both.
              dark
                ? "bg-action-invert text-night hover:bg-action-invert-deep"
                : "bg-action text-white hover:bg-action-deep",
              // Only give up the auto-margin when the phone link before it is
              // there to take over pushing this to the right.
              contact.phone && "xl:ms-4",
            )}
          >
            Book a car
          </PressLink>

          {contact.phone ? (
            <PressAnchor
              href={telHref(contact.phone)}
              aria-label={`Call ${contact.phone}`}
              className={cn(
                "hidden size-10 items-center justify-center rounded-full border min-[340px]:inline-flex xl:hidden",
                dark ? "edge-light text-paper" : "border-line text-ink",
              )}
            >
              <Phone className="size-4" aria-hidden />
            </PressAnchor>
          ) : null}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            data-pressable="control"
            className={cn(
              "rounded-full p-2 lg:hidden",
              dark ? "text-paper" : "text-ink",
            )}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <nav
          hidden={!open}
          className={cn(
            // Solid, and in the same mode as the bar above it. Translucent was
            // wrong twice over: a light panel needs a light page behind it to
            // stay readable, and over the hero there is a black photograph
            // instead, which turned the whole menu to mud. A menu is also a
            // surface you read rather than one you look past, so there is
            // nothing to be gained by seeing through it.
            "menu-sheet border-t px-5 pb-5 shadow-[0_18px_40px_rgba(11,11,13,0.18)] lg:hidden",
            dark ? "border-white/10 bg-night" : "border-line bg-paper",
          )}
          aria-label="Main"
        >
          {LINKS.map((link) => (
            <PressLink
              key={link.href}
              href={link.href}
              className={cn(
                "block border-b py-3.5 text-[0.9375rem] font-medium",
                dark ? "border-white/10" : "border-line/70",
                link.owners
                  ? dark
                    ? "text-paper/60"
                    : "text-muted"
                  : dark
                    ? "text-paper"
                    : "text-ink",
              )}
            >
              {link.label}
            </PressLink>
          ))}
          <PressLink
            href="/book"
            className={cn(
              "mt-4 block rounded-full px-5 py-3 text-center text-sm font-semibold",
              dark ? "bg-action-invert text-night" : "bg-action text-white",
            )}
          >
            Book a car
          </PressLink>
        </nav>
      </header>
      {overlaid ? null : (
        <div className="h-[3.75rem] sm:h-[4rem]" aria-hidden />
      )}
    </>
  );
};
