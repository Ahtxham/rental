import { NextResponse, type NextRequest } from "next/server";

import { API_BASE } from "@/lib/api";

/**
 * A booking request, passed through to the backend.
 *
 * **The customer's IP travels with it.** The backend rate-limits these by
 * address, and every request arriving from this site shares one server, so
 * without forwarding the real client the limiter would count the whole
 * website as a single visitor and one busy afternoon would start refusing
 * genuine bookings. The backend runs behind a proxy already (`trust proxy` is
 * set), so `x-forwarded-for` is what it reads.
 */
export const POST = async (request: NextRequest) => {
  const body = await request.text();
  const forwarded =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";

  try {
    const response = await fetch(`${API_BASE}/api/public/rentals/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwarded ? { "x-forwarded-for": forwarded } : {}),
      },
      body,
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { message: "We could not send that just now. Please call or WhatsApp us." },
      { status: 503 },
    );
  }
};
