import { NextResponse, type NextRequest } from "next/server";

import { API_BASE } from "@/lib/api";
import { setAdminToken } from "@/lib/admin-session";

/** Sign in, and put the token somewhere the browser cannot read it. */
export const POST = async (request: NextRequest) => {
  const forwarded =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // The backend throttles sign-in attempts by address; without this every
        // attempt from the website looks like the same visitor.
        ...(forwarded ? { "x-forwarded-for": forwarded } : {}),
      },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Could not reach the API. Try again." }, { status: 503 });
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

  await setAdminToken(data.token);
  // The token is deliberately not in this response body.
  return NextResponse.json({ data: { user: data.user } }, { status: 200 });
};
