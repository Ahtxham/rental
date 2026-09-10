"use client";

import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Field, Input } from "@/components/ui";
import type { AdminDriver } from "@/lib/admin-types";
import { shortDate } from "@/lib/format";

/**
 * The roster of people who go out with a car.
 *
 * A list, not an employment system: no logins, no shifts, no payroll. What the
 * office has to know is who took the car, how to reach them, and whether their
 * licence is still valid, because a customer in the back seat has every right
 * to ask.
 */
const expiringSoon = (date?: string) => {
  if (!date) return false;
  const days = (new Date(date).getTime() - Date.now()) / 86_400_000;
  return days < 60;
};

export const DriverManager = ({ drivers }: { drivers: AdminDriver[] }) => {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    cnic: "",
    licenceNumber: "",
    licenceExpiry: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          cnic: form.cnic.trim() || undefined,
          licenceNumber: form.licenceNumber.trim() || undefined,
          licenceExpiry: form.licenceExpiry || undefined,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not work.");
      } else {
        setForm({ fullName: "", phone: "", cnic: "", licenceNumber: "", licenceExpiry: "" });
        setAdding(false);
        router.refresh();
      }
    } catch {
      setError("Could not reach the API.");
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) setError(body.message ?? "That did not work.");
      else router.refresh();
    } catch {
      setError("Could not reach the API.");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Drivers</h1>
          <p className="mt-1 text-sm text-muted">
            Who can be sent out with a car. They have no login here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-white hover:bg-brass-bright"
        >
          <Plus className="size-4" aria-hidden />
          Add a driver
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm text-alert" role="alert">
          <AlertCircle className="me-1.5 inline size-4" aria-hidden />
          {error}
        </p>
      ) : null}

      {adding ? (
        <form onSubmit={submit} className="rounded-2xl border border-line bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                required
                className="tnum"
              />
            </Field>
            <Field label="CNIC">
              <Input
                value={form.cnic}
                onChange={(event) => setForm({ ...form, cnic: event.target.value })}
                className="tnum"
              />
            </Field>
            <Field label="Licence number">
              <Input
                value={form.licenceNumber}
                onChange={(event) => setForm({ ...form, licenceNumber: event.target.value })}
                className="uppercase"
              />
            </Field>
            <Field label="Licence expires">
              <Input
                type="date"
                value={form.licenceExpiry}
                onChange={(event) => setForm({ ...form, licenceExpiry: event.target.value })}
                className="tnum"
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper hover:bg-forest-mid disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Add
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {drivers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">
            Nobody on the roster yet. A chauffeur-driven booking needs somebody to
            put against it.
          </p>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver._id}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-4 last:border-b-0"
            >
              <div className="min-w-44 flex-1">
                <p className="text-sm font-semibold text-ink">{driver.fullName}</p>
                <p className="text-xs text-muted tnum">{driver.phone}</p>
              </div>
              <p className="min-w-36 text-xs text-muted tnum">
                {driver.licenceNumber ?? "no licence on file"}
              </p>
              {driver.licenceExpiry ? (
                <Badge tone={expiringSoon(driver.licenceExpiry) ? "warn" : "neutral"}>
                  licence to {shortDate(driver.licenceExpiry)}
                </Badge>
              ) : null}
              <Badge tone={driver.status === "active" ? "good" : "neutral"}>{driver.status}</Badge>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(driver._id)}
                aria-label={`Remove ${driver.fullName}`}
                className="rounded-full border border-alert/30 p-2 text-alert hover:bg-alert/5 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
