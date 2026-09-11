import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { adminFetch } from "@/lib/admin-api";
import { SITE_CONFIG_TAG } from "@/lib/api";

/**
 * Everything else the office does, forwarded with the session's bearer.
 *
 * One handler rather than a file per endpoint: the admin screens touch a dozen
 * backend routes and every one of them would be the same eight lines.
 *
 * The prefix list is the point. Without it this would forward ANY path to the
 * backend as an admin, including ones added later that nobody thought about
 * from the browser's side. The backend authorises every request on its own, so
 * this is not the only guard, but a proxy that will carry a token anywhere is
 * a proxy somebody eventually finds a use for.
 */
const ALLOWED = ["rentals", "cars", "drivers", "team", "notifications", "uploads", "auth"];

const forward = async (request: NextRequest, path: string[], method: string) => {
  if (!ALLOWED.includes(path[0] ?? "")) {
    return NextResponse.json({ message: "Not available." }, { status: 404 });
  }

  const search = request.nextUrl.search;
  const body = method === "GET" || method === "DELETE" ? undefined : await request.text();
  const { status, body: result } = await adminFetch(`/api/${path.join("/")}${search}`, {
    method,
    ...(body === undefined ? {} : { body }),
  });

  /**
   * Saving Settings writes the phone number, the address and the self-drive
   * switch that the PUBLIC site reads, and that read is cached for an hour.
   * Clearing the tag here is what makes the change visible on the next
   * request. Without it somebody corrects their number, reloads the homepage,
   * still sees the old one, and reasonably concludes the field does nothing.
   */
  if (status === 200 && method === "PATCH" && path[0] === "auth" && path[1] === "me") {
    // `{ expire: 0 }`, not the recommended "max". "max" serves the stale copy
    // while it revalidates behind the scenes, so whoever just corrected the
    // phone number reloads the homepage and still sees the old one, which is
    // the exact confusion this is here to prevent. Zero makes the next request
    // block on fresh data. That costs one slow request on a value that changes
    // twice a year.
    //
    // `updateTag` would be the read-your-own-writes tool, but it can only be
    // called from a Server Action and this is a Route Handler.
    revalidateTag(SITE_CONFIG_TAG, { expire: 0 });
  }

  return NextResponse.json(result, { status });
};

type Context = { params: Promise<{ path: string[] }> };

export const GET = async (request: NextRequest, { params }: Context) =>
  forward(request, (await params).path, "GET");
export const POST = async (request: NextRequest, { params }: Context) =>
  forward(request, (await params).path, "POST");
export const PATCH = async (request: NextRequest, { params }: Context) =>
  forward(request, (await params).path, "PATCH");
export const DELETE = async (request: NextRequest, { params }: Context) =>
  forward(request, (await params).path, "DELETE");
