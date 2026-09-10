import { NextResponse } from "next/server";

import { lenderFetch } from "@/lib/lender-api";

export const GET = async () => {
  const { status, body } = await lenderFetch("/me");
  return NextResponse.json(body, { status });
};

export const PATCH = async (request: Request) => {
  const { status, body } = await lenderFetch("/me", {
    method: "PATCH",
    body: await request.text(),
  });
  return NextResponse.json(body, { status });
};
