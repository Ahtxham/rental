import type { Metadata } from "next";

import { SettingsForm, type Agency } from "@/components/admin/settings-form";
import { adminFetch } from "@/lib/admin-api";

export const metadata: Metadata = { title: "Settings" };

const SettingsPage = async () => {
  const { body } = await adminFetch("/api/auth/me");
  const agency = (body as { agency?: Agency }).agency;

  if (!agency) {
    return (
      <p className="rounded-2xl border border-dashed border-line p-8 text-sm text-muted">
        Could not load the business record. The API may be down.
      </p>
    );
  }

  return <SettingsForm agency={agency} />;
};

export default SettingsPage;
