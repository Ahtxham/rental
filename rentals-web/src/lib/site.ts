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
  // Unreachable is the only case the env values are for.
  if (!config) return FALLBACK_CONTACT;

  // Answered, so what it says is the truth, including the blanks. An empty
  // field means the office has not set one, and the page renders nothing
  // rather than a placeholder that looks like a real number.
  return {
    phone: config.phone || null,
    whatsapp: config.whatsapp || null,
    email: config.email || null,
    address: [config.address, config.city].filter(Boolean).join(", ") || null,
    streetAddress: config.address || null,
    city: config.city || null,
    selfDriveEnabled: config.selfDriveEnabled,
  };
};
