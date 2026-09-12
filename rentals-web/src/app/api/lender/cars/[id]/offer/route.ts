import { NextResponse } from "next/server";

import { lenderFetch } from "@/lib/lender-api";

/**
 * The car owner answering the office's terms.
 *
 * A POST rather than a PATCH because it is not an edit: it is a decision, made
 * once, that either publishes the car or sends it back for a better number.
 */
export const POST = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { status, body } = await lenderFetch(`/cars/${id}/offer`, {
    method: "POST",
    body: await request.text(),
  });
  return NextResponse.json(body, { status });
};
