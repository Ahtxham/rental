import "server-only";

import { API_BASE } from "@/lib/api";
import { getLenderToken } from "@/lib/lender-session";

/**
 * One way through to the backend for everything a signed-in car owner does.
 *
 * Every call attaches the bearer from the cookie. A missing cookie is a 401
 * rather than an unauthenticated request, so a page that forgot to check the
 * session cannot quietly render as though nobody is signed in.
 */
export const lenderFetch = async (
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> => {
  const token = await getLenderToken();
  if (!token) return { status: 401, body: { message: "Please sign in." } };

  try {
    const response = await fetch(`${API_BASE}/api/lenders${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  } catch {
    return { status: 503, body: { message: "We could not reach the office. Try again." } };
  }
};
