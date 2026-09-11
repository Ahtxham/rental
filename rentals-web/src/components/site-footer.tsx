"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Container } from "@/components/ui";
import type { Contact } from "@/lib/config";
import { telHref, whatsappLink } from "@/lib/config";

const PAGES = [
  { href: "/book", label: "Book a car" },
  { href: "/cars", label: "Our cars" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/policies", label: "Terms and charges" },
];

const OWNERS = [
  { href: "/rent-your-car", label: "How lending works" },
  { href: "/rent-your-car#start", label: "List your car" },
  { href: "/lender", label: "Car owner sign in" },
];

const COMPANY = [
  { href: "/about", label: "About Musafir" },
  { href: "/contact", label: "Contact us" },
];

export const SiteFooter = ({ contact }: { contact: Contact }) => {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/lender")) return null;

  return (
    // No top margin. A margin here is a strip of page colour, and when the
    // section above happens to be dark that strip cuts one dark block in two
    // with a white line across it. The separation comes from the footer's own
    // top padding instead, which is dark and therefore invisible.
    <footer className="bg-night text-paper">
      <Container className="grid gap-10 pb-14 pt-20 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="font-display text-3xl font-semibold">Musafir</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-paper/55">
            Rent A Car
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/70">
            Cars for hire in Lahore, by the day, with one of our drivers or on
            your own. Every rate is quoted once, in full, before anything is
            held.
          </p>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
            Renting
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            {PAGES.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors duration-150 hover:text-paper/55"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mt-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
            Musafir
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            {COMPANY.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors duration-150 hover:text-paper/55"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Its own column, not a footnote under the renting links. The people
            this is for are not reading the rest of the footer. */}
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
            Own a car?
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            {OWNERS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors duration-150 hover:text-paper/55"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-paper/50">
            Earn from your car on the days you are not using it.
          </p>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
            Reach us
          </h2>
          {/* Each row appears only if the office has set it. A footer with one
              live contact method reads as a small business; a footer with four
              placeholders reads as an abandoned one. */}
          <ul className="mt-4 space-y-2.5 text-sm text-paper/80">
            {contact.phone ? (
              <li>
                <a
                  href={telHref(contact.phone)}
                  className="flex items-center gap-2 hover:text-paper/55"
                >
                  <Phone className="size-4 shrink-0" aria-hidden />
                  <span className="tnum">{contact.phone}</span>
                </a>
              </li>
            ) : null}
            {contact.whatsapp ? (
              <li>
                <a
                  href={whatsappLink(
                    contact.whatsapp,
                    "Assalam o alaikum, I would like to book a car.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-paper/55"
                >
                  <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.2-.7.1s-.7 1-.9 1.2c-.2.2-.3.2-.6.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-1-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4a3.4 3.4 0 0 0-1 2.5c0 1.5 1 2.9 1.2 3.1a11.4 11.4 0 0 0 4.4 3.9c1.6.6 2.2.7 3 .6.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2" />
                  </svg>
                  WhatsApp
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 hover:text-paper/55"
                >
                  <Mail className="size-4 shrink-0" aria-hidden />
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact.address ? (
              <li className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {contact.address}
              </li>
            ) : null}
          </ul>
        </div>
      </Container>

      <div className="border-t border-paper/15">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-5 text-xs text-paper/60">
          {/* The address comes from Settings like everything else here. Hardcoding
              the city meant the one line on the site the office could not
              change. */}
          <p>
            © {new Date().getFullYear()} Musafir Rent A Car
            {contact.address ? ` · ${contact.address}` : ""}
          </p>
          <Link href="/policies" className="hover:text-paper/55">
            Terms and charges
          </Link>
        </Container>
      </div>
    </footer>
  );
};
