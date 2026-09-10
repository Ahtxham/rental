import { NextResponse } from "next/server";

import { clearLenderToken } from "@/lib/lender-session";

export const POST = async () => {
  await clearLenderToken();
  return NextResponse.json({ data: { ok: true } });
};
