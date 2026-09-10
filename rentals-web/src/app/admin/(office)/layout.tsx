import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { adminFetch } from "@/lib/admin-api";

export const metadata: Metadata = {
  title: { default: "Office", template: "%s · Musafir Office" },
  // Nothing behind this layout belongs in a search index, ever.
  robots: { index: false, follow: false },
};

/**
 * The session gate for every admin screen.
 *
 * Checked here rather than in each page, and checked against the API rather
 * than against the presence of a cookie, a token that has been revoked, or
 * belongs to a suspended account, must not render an office screen with a
 * signed-out person looking at it.
 */
const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
  const { status, body } = await adminFetch("/api/auth/me");
  if (status === 401 || status === 403) redirect("/admin/login");

  const user = (body as { user?: { fullName?: string; email?: string } }).user;
  if (!user) redirect("/admin/login");

  return <AdminShell name={user.fullName || user.email || "Office"}>{children}</AdminShell>;
};

export default AdminLayout;
