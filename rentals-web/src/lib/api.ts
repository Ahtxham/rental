import "server-only";

/**
 * The backend, reached from this site's own server.
 *
 * `API_URL` is deliberately not `NEXT_PUBLIC_`: the browser talks only to this
 * site's `/api/*` route handlers, which call through to here. That keeps the
 * API off the public internet as far as the customer's browser is concerned,
 * and means no CORS to configure for a second origin.
 */
const API_URL = process.env.API_URL || "http://localhost:5012";

/** How a car is drivable. Both are offered; not every car offers both. */
export type DriveMode = "with-driver" | "self-drive";

export interface PublicCar {
  id: string;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  seats: number;
  fuelType: string;
  transmission: "manual" | "automatic" | null;
  features: string[];
  photos: string[];
  withDriverRate: number | null;
  /** Null when this car is not offered self-drive, or the business has it off. */
  selfDriveRate: number | null;
  kmIncludedPerDay: number | null;
  extraKmRate: number | null;
  description: string | null;
  /** Null when no dates were asked about, the showroom rather than an answer. */
  available: boolean | null;
  /** `partner` is somebody's own car, lent to us. The customer is not told. */
  source: "fleet" | "partner";
}

export interface SiteConfig {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  selfDriveEnabled: boolean;
  currency: string;
}

export interface Quote {
  car: string;
  days: number;
  dailyRate: number;
  rentAmount: number;
  kmIncluded: number | null;
  kmIncludedPerDay: number | null;
  extraKmRate: number | null;
  securityDeposit: number | null;
  withDriver: boolean;
  currency: string;
  note: string;
}

export const publicApi = async <T>(
  path: string,
  init?: RequestInit & { revalidate?: number; tags?: string[] },
): Promise<T | null> => {
  try {
    const response = await fetch(`${API_URL}/api/public/rentals${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      // The list changes when a car is added or a booking is confirmed, neither
      // of which is often. A minute is short enough that a car booked this
      // morning is gone from the site by lunch, and long enough that a page of
      // traffic does not become a page of database reads.
      next: { revalidate: init?.revalidate ?? 60, tags: init?.tags },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // The website stays up when the backend does not. Callers render the page
    // without live cars rather than showing a stack trace to a customer.
    return null;
  }
};

export const getCars = async (from?: string, to?: string): Promise<PublicCar[]> => {
  const query = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
  const body = await publicApi<{ data: PublicCar[] }>(`/cars${query}`);
  return body?.data ?? [];
};

export const getCar = async (id: string): Promise<PublicCar | null> => {
  const body = await publicApi<{ data: PublicCar }>(`/cars/${encodeURIComponent(id)}`);
  return body?.data ?? null;
};

/** The cache tag the office's settings screen clears when it saves. */
export const SITE_CONFIG_TAG = "site-config";

/**
 * The business's own public details, so a phone number lives in one place.
 *
 * Cached for an hour, because this changes twice a year and every page in the
 * site renders the footer. The hour is only a backstop though: saving in
 * Settings clears this tag, so a corrected phone number is live on the next
 * request rather than up to an hour later. Without that, somebody changes
 * their number, reloads, sees the old one and reasonably concludes the field
 * does nothing.
 *
 * Callers fall back to env when it is unreachable, see `lib/config.ts`.
 */
export const getSiteConfig = async (): Promise<SiteConfig | null> => {
  const body = await publicApi<{ data: SiteConfig }>("/config", {
    revalidate: 3600,
    tags: [SITE_CONFIG_TAG],
  });
  return body?.data ?? null;
};

export const API_BASE = API_URL;
