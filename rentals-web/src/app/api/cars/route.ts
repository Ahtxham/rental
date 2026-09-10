import { NextResponse, type NextRequest } from "next/server";

import { API_BASE } from "@/lib/api";

/**
 * The browser's only way to the car list.
 *
 * Everything the customer's browser calls is same-origin; this hands it on to
 * the backend server-side. That keeps `API_URL` out of the client bundle and
 * saves configuring CORS on the backend for a second origin.
 */
export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const query = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";

  try {
    const response = await fetch(`${API_BASE}/api/public/rentals/cars${query}`, {
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "Could not load the cars right now." }, { status: 503 });
  }
};
