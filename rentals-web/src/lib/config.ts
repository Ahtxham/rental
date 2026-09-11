/**
 * The details printed in the header, the footer and every WhatsApp link.
 *
 * Client-safe on purpose: the header and the search form are client
 * components, and this module must not drag `server-only` into their bundle.
 * The values themselves are fetched server-side by `getContact` in
 * `lib/site.ts` and handed down as props.
 */
export interface Contact {
  /**
   * Null when the office has not set one yet.
   *
   * Nullable on purpose, and the distinction matters on a live site: an unset
   * number must render as no number, not as a plausible-looking fake one. A
   * customer who dials a placeholder and reaches a stranger is worse off than
   * one who sees a WhatsApp button instead.
   */
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  /** For display: street and city joined, e.g. "Gulberg III, Lahore". */
  address: string | null;
  /**
   * The street on its own, for structured data.
   *
   * Kept apart from `address` because the display string folds the city in,
   * and feeding that to `streetAddress` told search engines the street was
   * called "Lahore". A wrong address in JSON-LD is one an assistant will read
   * back to somebody trying to find you.
   */
  streetAddress: string | null;
  city: string | null;
  /** Whether the business offers self-drive at all. Hides every self-drive price. */
  selfDriveEnabled: boolean;
}

/**
 * What the page falls back to when the API is UNREACHABLE.
 *
 * A rental site whose phone number disappears because the backend restarted is
 * worse than one showing a number a week out of date.
 *
 * This is not the same as a field the office has left empty. That case returns
 * null and the page renders nothing, see `getContact`. Conflating the two is
 * how a placeholder ends up printed on a live site as though it were real.
 */
export const FALLBACK_CONTACT: Contact = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || null,
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || null,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || null,
  streetAddress: null,
  city: null,
  selfDriveEnabled: false,
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://musafircars.com";

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const whatsappLink = (whatsapp: string, message: string) =>
  `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
