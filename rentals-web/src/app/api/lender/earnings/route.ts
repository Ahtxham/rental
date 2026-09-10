import { NextResponse } from "next/server";

import { lenderFetch } from "@/lib/lender-api";

export const GET = async () => {
  const { status, body } = await lenderFetch("/earnings");
  return NextResponse.json(body, { status });
};
