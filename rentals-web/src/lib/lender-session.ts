import "server-only";

import { cookies } from "next/headers";

/**
 * The car owner's session, in an httpOnly cookie.
 *
 * The token never reaches client JavaScript, the browser calls this site's
 * own `/api/lender/*` handlers, which read the cookie server-side and attach
 * the bearer on the way to the backend. It is the same shape the fleet portal
 * uses, for the same reason: a token in `localStorage` is a token any script
 * on the page can read, and this is a public site.
 */
export const LENDER_COOKIE = "musafir_lender";

const options = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Browsers silently DISCARD a `Secure` cookie over plain http, which in
  // development means a login that appears to succeed and then does nothing.
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};

export const setLenderToken = async (token: string) => {
  (await cookies()).set(LENDER_COOKIE, token, options);
};

export const clearLenderToken = async () => {
  (await cookies()).delete(LENDER_COOKIE);
};

export const getLenderToken = async (): Promise<string | null> =>
  (await cookies()).get(LENDER_COOKIE)?.value ?? null;
