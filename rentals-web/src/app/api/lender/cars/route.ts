import { NextResponse } from "next/server";

import { lenderFetch } from "@/lib/lender-api";

export const GET = async () => {
  const { status, body } = await lenderFetch("/cars");
  return NextResponse.json(body, { status });
};

export const POST = async (request: Request) => {
  const { status, body } = await lenderFetch("/cars", {
    method: "POST",
    body: await request.text(),
  });
  return NextResponse.json(body, { status });
};
