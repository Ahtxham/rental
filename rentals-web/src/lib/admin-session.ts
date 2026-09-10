import "server-only";

import { cookies } from "next/headers";

/**
 * The office's session, in an httpOnly cookie.
 *
 * The token never reaches client JavaScript: the browser calls this site's own
 * `/api/admin/*` handlers, which read the cookie server-side and attach the
 * bearer on the way to the backend. An admin token opens every booking and
 * every customer's phone number, so `localStorage`, readable by any script
 * that gets onto the page, is not an option.
 */
export const ADMIN_COOKIE = "musafir_admin";

const options = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Browsers silently DISCARD a `Secure` cookie over plain http, which in
  // development means a login that appears to succeed and then does nothing.
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};

export const setAdminToken = async (token: string) => {
  (await cookies()).set(ADMIN_COOKIE, token, options);
};

export const clearAdminToken = async () => {
  (await cookies()).delete(ADMIN_COOKIE);
};

export const getAdminToken = async (): Promise<string | null> =>
  (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
