import { NextResponse } from "next/server";

import { clearAdminToken } from "@/lib/admin-session";

export const POST = async () => {
  await clearAdminToken();
  return NextResponse.json({ message: "Signed out." });
};
