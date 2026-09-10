/**
 * The details printed in the header, the footer and every WhatsApp link.
 *
 * Client-safe on purpose: the header and the search form are client
 * components, and this module must not drag `server-only` into their bundle.
 * The values themselves are fetched server-side by `getContact` in
 * `lib/site.ts` and handed down as props.
 */
export interface Contact {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  /** Whether the business offers self-drive at all. Hides every self-drive price. */
  selfDriveEnabled: boolean;
}

/**
 * What the page falls back to when the API is unreachable.
 *
 * A rental site whose phone number disappears because the backend restarted is
 * worse than one showing a number a week out of date.
 */
export const FALLBACK_CONTACT: Contact = {
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+92 300 0000000",
  whatsapp: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "923000000000",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@musafircars.com",
  address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || "Lahore, Pakistan",
  selfDriveEnabled: false,
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://musafircars.com";

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const whatsappLink = (whatsapp: string, message: string) =>
  `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
