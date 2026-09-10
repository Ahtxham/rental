import "server-only";

import { getSiteConfig } from "@/lib/api";
import { FALLBACK_CONTACT, type Contact } from "@/lib/config";

/**
 * The business's own details, from the backend, with env as the safety net.
 *
 * Two sources on purpose. The backend is the real one, the office edits its
 * number in settings and the site follows without a deploy, and the env
 * values are what renders when the API is unreachable.
 */
export const getContact = async (): Promise<Contact> => {
  const config = await getSiteConfig();
  if (!config) return FALLBACK_CONTACT;
  return {
    phone: config.phone || FALLBACK_CONTACT.phone,
    whatsapp: config.whatsapp || FALLBACK_CONTACT.whatsapp,
    email: config.email || FALLBACK_CONTACT.email,
    address: [config.address, config.city].filter(Boolean).join(", ") || FALLBACK_CONTACT.address,
    selfDriveEnabled: config.selfDriveEnabled,
  };
};
