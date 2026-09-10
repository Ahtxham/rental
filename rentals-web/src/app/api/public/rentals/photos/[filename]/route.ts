import { NextResponse } from "next/server";

import { API_BASE } from "@/lib/api";

/**
 * A car photo, streamed from the backend.
 *
 * The path deliberately MIRRORS the backend's own
 * (`/api/public/rentals/photos/:filename`), so the URL the API puts in a car's
 * `photos` needs no rewriting to work here. The browser only ever talks to
 * this origin, and in production the backend listens on a private address the
 * browser could not reach even if it were told to.
 *
 * The backend decides whether the file may be seen at all: it serves a name
 * only when a published car actually references it, so a real filename
 * belonging to somebody's CNIC gets a 404 there and a 404 here.
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) => {
  const { filename } = await params;

  try {
    const response = await fetch(
      `${API_BASE}/api/public/rentals/photos/${encodeURIComponent(filename)}`,
    );
    if (!response.ok || !response.body) {
      return NextResponse.json({ message: "Not found." }, { status: 404 });
    }

    // Streamed rather than buffered: these are photographs, and holding each
    // one in memory to hand it straight on achieves nothing.
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        // The name carries a timestamp and sixteen random hex characters, so a
        // given URL is always the same bytes and can be cached for ever.
        "Cache-Control": response.headers.get("cache-control") ?? "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
};
