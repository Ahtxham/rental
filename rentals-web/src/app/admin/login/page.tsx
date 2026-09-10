import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { adminFetch } from "@/lib/admin-api";

export const metadata: Metadata = {
  title: "Office sign in",
  robots: { index: false, follow: false },
};

/**
 * Deliberately OUTSIDE the `(office)` route group.
 *
 * That group's layout bounces an unauthenticated request here; if this page
 * were inside it, arriving signed out would redirect to itself for ever.
 */
const AdminLoginPage = async () => {
  // Already signed in? The login page is not what they came for.
  const { status } = await adminFetch("/api/auth/me");
  if (status === 200) redirect("/admin");

  return <AdminLoginForm />;
};

export default AdminLoginPage;
