import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LenderAuthForm } from "@/components/lender-auth-form";
import { getLenderToken } from "@/lib/lender-session";

export const metadata: Metadata = {
  title: "Car owner sign in",
  robots: { index: false, follow: false },
};

const LenderLoginPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) => {
  // Already signed in? The login page is not what they came for.
  if (await getLenderToken()) redirect("/lender");

  const { mode } = await searchParams;
  return <LenderAuthForm initialMode={mode === "signup" ? "signup" : "login"} />;
};

export default LenderLoginPage;
