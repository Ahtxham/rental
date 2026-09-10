import { NextResponse, type NextRequest } from "next/server";

import { API_BASE } from "@/lib/api";
import { setLenderToken } from "@/lib/lender-session";

/**
 * Sign in or sign up, and put the token somewhere the browser cannot read it.
 *
 * One handler for both because the two differ only in which backend path they
 * hit and what they send, and the thing that matters, taking the token out of
 * the response before it reaches the page, is identical.
 */
export const POST = async (request: NextRequest) => {
  const body = (await request.json()) as Record<string, unknown> & { mode?: string };
  const mode = body.mode === "signup" ? "signup" : "login";
  const { mode: _mode, ...payload } = body;

  const forwarded =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/lenders/auth/${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The backend rate-limits sign-in attempts by address; without this
        // every attempt from the website looks like the same visitor.
        ...(forwarded ? { "x-forwarded-for": forwarded } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "We could not reach the office. Try again." }, { status: 503 });
  }

  const data = (await response.json().catch(() => ({}))) as {
    token?: string;
    user?: unknown;
    message?: string;
  };

  if (!response.ok || !data.token) {
    return NextResponse.json(
      { message: data.message ?? "That did not work." },
      { status: response.status === 200 ? 502 : response.status },
    );
  }

  await setLenderToken(data.token);
  // The token is deliberately not in this response body.
  return NextResponse.json({ data: { user: data.user } }, { status: 200 });
};
