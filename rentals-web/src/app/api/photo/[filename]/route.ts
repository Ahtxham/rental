import { NextResponse } from "next/server";

import { API_BASE } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-session";
import { getLenderToken } from "@/lib/lender-session";

/**
 * An uploaded file, for somebody who is signed in.
 *
 * Stored photo URLs are `/uploads/<name>`, which is a backend path: the
 * browser is on this origin and gets a 404, which is why every thumbnail in
 * the office and in a car owner's garage was a broken image. This streams the
 * file from the backend with whichever session the request actually has.
 *
 * One route for both kinds of account rather than two, because the backend
 * applies the same rule to both: `GET /api/uploads/:filename` is open to any
 * signed-in account, so attaching an admin bearer instead of a lender's grants
 * nothing extra. Splitting it in two would imply a distinction that does not
 * exist and would rot the first time only one half was updated.
 *
 * Car photos destined for the public website do NOT come through here, they go
 * through `/api/public/rentals/photos/:filename`, which needs no session and
 * serves only files a published car references.
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) => {
  const token = (await getAdminToken()) ?? (await getLenderToken());
  if (!token) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const { filename } = await params;

  try {
    const response = await fetch(`${API_BASE}/api/uploads/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok || !response.body) {
      return NextResponse.json({ message: "Not found." }, { status: response.status });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        // Private, and short. These are identity documents as often as they are
        // cars, and a shared cache must never hold one.
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Not found." }, { status: 503 });
  }
};
