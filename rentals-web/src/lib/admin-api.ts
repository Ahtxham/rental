import "server-only";

import { API_BASE } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-session";

/**
 * One way through to the backend for everything the office does.
 *
 * Every call attaches the bearer from the cookie. A missing cookie is a 401
 * rather than an unauthenticated request, so a page that forgot to check the
 * session cannot quietly render as though nobody is signed in.
 */
export const adminFetch = async (
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown }> => {
  const token = await getAdminToken();
  if (!token) return { status: 401, body: { message: "Please sign in." } };

  try {
    const response = await fetch(`${API_BASE}${path}`, {
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
    return { status: 503, body: { message: "Could not reach the API. Try again." } };
  }
};

/** Unwrap `{ data }`, or an empty list when the call did not go through. */
export const adminList = async <T>(path: string): Promise<T[]> => {
  const { status, body } = await adminFetch(path);
  if (status !== 200) return [];
  return ((body as { data?: T[] }).data ?? []) as T[];
};
