import { NextResponse } from "next/server";

import { API_BASE } from "@/lib/api";
import { getAdminToken } from "@/lib/admin-session";

/**
 * A photo of a car, passed through to the backend's upload route.
 *
 * Rebuilt as a fresh FormData rather than streamed: `fetch` then sets its own
 * multipart boundary, and a forwarded `Content-Type` whose boundary no longer
 * matches the body is the classic way this breaks. The backend checks the
 * file's magic bytes, so nothing here has to trust the type the browser
 * claimed.
 *
 * Not routed through `/api/admin/[...path]` because that handler forwards JSON,
 * and multipart needs the body handed over untouched.
 */
export const POST = async (request: Request) => {
  const token = await getAdminToken();
  if (!token) return NextResponse.json({ message: "Please sign in." }, { status: 401 });

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file." }, { status: 422 });
  }

  const outgoing = new FormData();
  outgoing.append("file", file);

  try {
    const response = await fetch(`${API_BASE}/api/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
      cache: "no-store",
    });
    return NextResponse.json(await response.json().catch(() => ({})), {
      status: response.status,
    });
  } catch {
    return NextResponse.json({ message: "That photo did not upload." }, { status: 503 });
  }
};
