"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Field, Input } from "@/components/ui";

export interface AgencySettings {
  currency: string;
  commissionPercent: number;
  defaultSecurityDeposit: number;
  defaultKmIncludedPerDay: number;
  defaultExtraKmRate: number;
  selfDriveEnabled: boolean;
}

export interface Agency {
  name: string;
  legalName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  settings: AgencySettings;
}

/**
 * The business's own record.
 *
 * Two things on this page reach a customer directly and are worth knowing
 * about: the contact details, which the website reads live, and the self-drive
 * switch, which takes every self-drive price off the site in one move.
 */
export const SettingsForm = ({ agency }: { agency: Agency }) => {
  const router = useRouter();
  const [form, setForm] = useState({
    name: agency.name ?? "",
    legalName: agency.legalName ?? "",
    phone: agency.phone ?? "",
    whatsapp: agency.whatsapp ?? "",
    email: agency.email ?? "",
    address: agency.address ?? "",
    city: agency.city ?? "",
    commissionPercent: String(agency.settings.commissionPercent ?? 20),
    defaultSecurityDeposit: String(agency.settings.defaultSecurityDeposit ?? 0),
    defaultKmIncludedPerDay: String(agency.settings.defaultKmIncludedPerDay ?? 0),
    defaultExtraKmRate: String(agency.settings.defaultExtraKmRate ?? 0),
    selfDriveEnabled: agency.settings.selfDriveEnabled ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Nested under `agency`, because these are the BUSINESS's details, not
        // the signed-in person's. Sent flat, `phone` used to mean both and
        // saving this screen quietly overwrote your own number with the
        // office's.
        body: JSON.stringify({
          agency: {
            name: form.name.trim(),
            legalName: form.legalName.trim(),
            phone: form.phone.trim(),
            whatsapp: form.whatsapp.replace(/\D/g, ""),
            email: form.email.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            commissionPercent: Number(form.commissionPercent) || 0,
            defaultSecurityDeposit: Number(form.defaultSecurityDeposit) || 0,
            defaultKmIncludedPerDay: Number(form.defaultKmIncludedPerDay) || 0,
            defaultExtraKmRate: Number(form.defaultExtraKmRate) || 0,
            selfDriveEnabled: form.selfDriveEnabled,
          },
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not work.");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          The website reads its contact details from here, so a number changes in
          one place.
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-xl font-semibold">On the website</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Trading name">
            <Input value={form.name} onChange={(event) => set("name", event.target.value)} />
          </Field>
          <Field label="Registered name" hint="Printed on the agreement, not the site.">
            <Input
              value={form.legalName}
              onChange={(event) => set("legalName", event.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="WhatsApp" hint="Digits with the country code, e.g. 923001234567.">
            <Input
              value={form.whatsapp}
              onChange={(event) => set("whatsapp", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>
          <Field label="City">
            <Input value={form.city} onChange={(event) => set("city", event.target.value)} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={(event) => set("address", event.target.value)} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-xl font-semibold">How you charge</h2>

        <label className="mt-5 flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.selfDriveEnabled}
            onChange={(event) => set("selfDriveEnabled", event.target.checked)}
            className="mt-1 size-4 accent-[#1d1d20]"
          />
          <span>
            <span className="text-sm font-semibold text-ink">Offer self-drive</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted">
              Turning this off takes every self-drive price off the website at
              once, whatever the individual cars say. A partner&apos;s car is never
              offered self-drive either way, that is not a setting.
            </span>
          </span>
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Commission on a partner car, %"
            hint="Copied onto a booking when it is confirmed, so changing it never moves money already promised."
          >
            <Input
              type="number"
              min={0}
              max={100}
              value={form.commissionPercent}
              onChange={(event) => set("commissionPercent", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="Default security deposit">
            <Input
              type="number"
              min={0}
              value={form.defaultSecurityDeposit}
              onChange={(event) => set("defaultSecurityDeposit", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="Default km included per day">
            <Input
              type="number"
              min={0}
              value={form.defaultKmIncludedPerDay}
              onChange={(event) => set("defaultKmIncludedPerDay", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="Default rate per extra km">
            <Input
              type="number"
              min={0}
              value={form.defaultExtraKmRate}
              onChange={(event) => set("defaultExtraKmRate", event.target.value)}
              className="tnum"
            />
          </Field>
        </div>
      </section>

      {error ? (
        <p className="note-enter flex gap-2 rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm text-alert" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <button data-pressable="control"
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-night px-6 py-3 text-sm font-semibold text-paper hover:bg-action-deep disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save
        </button>
        {saved ? <p className="text-sm font-semibold text-ink">Saved.</p> : null}
      </div>
    </form>
  );
};
