import { NextResponse, type NextRequest } from "next/server";

import { API_BASE } from "@/lib/api";

/**
 * A price for a booking, passed through to the backend.
 *
 * The website never does this arithmetic itself. A rental day is 24 hours
 * rounded up with an hour of grace, and two implementations of that rule are
 * two chances to quote a customer a number their invoice will not match.
 */
export const POST = async (request: NextRequest) => {
  const body = await request.text();
  const forwarded =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";

  try {
    const response = await fetch(`${API_BASE}/api/public/rentals/quote`, {
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
      { message: "We could not price that just now. Please call us." },
      { status: 503 },
    );
  }
};
