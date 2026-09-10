"use client";

import { AlertCircle, ArrowLeft, Loader2, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  asObject,
  carLabel,
  STATUS_LABEL,
  STATUS_TONE,
  type AdminCar,
  type AdminDriver,
  type AdminRental,
} from "@/lib/admin-types";
import { pkr, shortDate } from "@/lib/format";

/**
 * One booking, and every move the office can make on it.
 *
 * Built as one screen rather than a wizard because the office does these out
 * of order: a car is priced, then the customer calls back and changes a date,
 * then it is confirmed. A flow that insists on a sequence is a flow people
 * work around by editing the database.
 *
 * Which controls appear is driven entirely by `status`. The backend enforces
 * the same ladder, so a stale tab cannot skip a step, this only decides what
 * is worth showing.
 */
const number = (value: string) => (value.trim() === "" ? undefined : Number(value));

export const BookingDetail = ({
  rental: initial,
  cars,
  drivers,
  currency,
}: {
  rental: AdminRental;
  cars: AdminCar[];
  drivers: AdminDriver[];
  currency: string;
}) => {
  const router = useRouter();
  const [rental, setRental] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // The priced fields, as strings so a half-typed number does not become NaN.
  const [carId, setCarId] = useState(asObject(rental.car)?._id ?? "");
  const [driverId, setDriverId] = useState(asObject(rental.driver)?._id ?? "");
  const [withDriver, setWithDriver] = useState(rental.withDriver);
  const [dailyRate, setDailyRate] = useState(String(rental.dailyRate || ""));
  const [kmIncluded, setKmIncluded] = useState(String(rental.kmIncludedPerDay ?? ""));
  const [extraKmRate, setExtraKmRate] = useState(String(rental.extraKmRate ?? ""));
  const [driverAllowance, setDriverAllowance] = useState(String(rental.driverAllowance || ""));
  const [deliveryCharge, setDeliveryCharge] = useState(String(rental.deliveryCharge || ""));
  const [discount, setDiscount] = useState(String(rental.discount || ""));
  const [deposit, setDeposit] = useState(String(rental.securityDeposit || ""));
  const [advance, setAdvance] = useState(String(rental.advancePaid || ""));
  const [notes, setNotes] = useState(rental.notes ?? "");

  // Handover / return.
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [checkNote, setCheckNote] = useState("");

  const call = async (path: string, method: string, payload?: unknown, label?: string) => {
    setBusy(label ?? path);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/rentals/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      });
      const body = (await response.json()) as { data?: AdminRental; message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not work.");
      } else {
        if (body.data) setRental(body.data);
        setMessage(body.message ?? "Saved.");
        router.refresh();
      }
    } catch {
      setError("Could not reach the API.");
    }
    setBusy(null);
  };

  const priceBody = () => ({
    car: carId || undefined,
    driver: driverId || undefined,
    withDriver,
    dailyRate: number(dailyRate) ?? 0,
    kmIncludedPerDay: number(kmIncluded),
    extraKmRate: number(extraKmRate),
    driverAllowance: number(driverAllowance) ?? 0,
    deliveryCharge: number(deliveryCharge) ?? 0,
    discount: number(discount) ?? 0,
    securityDeposit: number(deposit) ?? 0,
    advancePaid: number(advance) ?? 0,
    notes,
  });

  const live = rental.status === "enquiry" || rental.status === "confirmed";
  const car = asObject(rental.car);
  const listed = asObject(rental.listedCar);

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All bookings
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">{rental.customer.fullName}</h1>
            <Badge tone={STATUS_TONE[rental.status]}>{STATUS_LABEL[rental.status]}</Badge>
            {listed ? <Badge tone="brass">Partner car</Badge> : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-muted">
            <a
              href={`tel:${rental.customer.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1.5 font-semibold text-forest tnum"
            >
              <Phone className="size-3.5" aria-hidden />
              {rental.customer.phone}
            </a>
            {rental.customer.cnic ? <span className="tnum">CNIC {rental.customer.cnic}</span> : null}
            <span className="tnum">
              {shortDate(rental.startAt)} → {shortDate(rental.endAt)} · {rental.days}{" "}
              {rental.days === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
        <p className="text-end">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Total
          </span>
          <span className="font-display text-3xl font-semibold text-forest tnum">
            {pkr(rental.totalAmount)}
          </span>
          {rental.balanceDue ? (
            <span className="mt-0.5 block text-xs text-muted tnum">
              {pkr(rental.balanceDue)} still due
            </span>
          ) : null}
        </p>
      </header>

      {error ? (
        <p
          className="flex gap-2 rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm text-alert"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-forest/25 bg-forest-soft p-3 text-sm text-forest" role="status">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {live ? (
            <section className="rounded-2xl border border-line bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Price it</h2>
              <p className="mt-1 text-sm text-muted">
                Nothing here is published, the website never quotes a booking, the
                office does.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Car">
                  <select
                    value={carId}
                    onChange={(event) => setCarId(event.target.value)}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-brass"
                  >
                    <option value="">
                      {listed ? `${listed.make} ${listed.model} (partner)` : "Not chosen"}
                    </option>
                    {cars.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.make} {option.model} · {option.registrationNumber}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Driver">
                  <select
                    value={driverId}
                    onChange={(event) => setDriverId(event.target.value)}
                    disabled={!withDriver}
                    className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-brass disabled:opacity-50"
                  >
                    <option value="">Not assigned</option>
                    {drivers.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.fullName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Goes out" className="sm:col-span-2">
                  <div className="flex gap-2">
                    {[
                      { value: true, label: "With one of our drivers" },
                      { value: false, label: "Self-drive" },
                    ].map((option) => (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() => setWithDriver(option.value)}
                        aria-pressed={withDriver === option.value}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150",
                          withDriver === option.value
                            ? "border-forest bg-forest text-paper"
                            : "border-line text-ink-soft hover:border-forest/40",
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label={`Daily rate (${currency})`}>
                  <Input
                    type="number"
                    min={0}
                    value={dailyRate}
                    onChange={(event) => setDailyRate(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Km included per day">
                  <Input
                    type="number"
                    min={0}
                    value={kmIncluded}
                    onChange={(event) => setKmIncluded(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field
                  label="Each km over"
                  hint="Overage is only ever charged when BOTH of these are set."
                >
                  <Input
                    type="number"
                    min={0}
                    value={extraKmRate}
                    onChange={(event) => setExtraKmRate(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Driver allowance">
                  <Input
                    type="number"
                    min={0}
                    value={driverAllowance}
                    onChange={(event) => setDriverAllowance(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Delivery charge">
                  <Input
                    type="number"
                    min={0}
                    value={deliveryCharge}
                    onChange={(event) => setDeliveryCharge(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Discount">
                  <Input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Security deposit" hint="Held, not earned. Never in the total.">
                  <Input
                    type="number"
                    min={0}
                    value={deposit}
                    onChange={(event) => setDeposit(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Advance taken">
                  <Input
                    type="number"
                    min={0}
                    value={advance}
                    onChange={(event) => setAdvance(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </Field>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void call(rental._id, "PATCH", priceBody(), "save")}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-60"
                >
                  {busy === "save" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  Save
                </button>

                {rental.status === "enquiry" ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void call(`${rental._id}/confirm`, "POST", priceBody(), "confirm")
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper hover:bg-forest-mid disabled:opacity-60"
                  >
                    {busy === "confirm" ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    Confirm and hold the car
                  </button>
                ) : null}
              </div>
              {rental.status === "enquiry" ? (
                <p className="mt-2 text-xs text-muted">
                  Confirming is what makes the car unavailable to anybody else. An
                  enquiry holds nothing.
                </p>
              ) : null}
            </section>
          ) : null}

          {rental.status === "confirmed" || rental.status === "out" ? (
            <section className="rounded-2xl border border-line bg-card p-6">
              <h2 className="font-display text-xl font-semibold">
                {rental.status === "confirmed" ? "Handover" : "Return"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {rental.status === "confirmed"
                  ? "Read the odometer and the gauge with the customer standing there."
                  : `It went out on ${rental.handover?.odometer?.toLocaleString() ?? "-"} km.`}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Field label="Odometer now">
                  <Input
                    type="number"
                    min={0}
                    value={odometer}
                    onChange={(event) => setOdometer(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Fuel, in eighths" hint="Leave blank if nobody looked.">
                  <Input
                    type="number"
                    min={0}
                    max={8}
                    value={fuel}
                    onChange={(event) => setFuel(event.target.value)}
                    className="tnum"
                  />
                </Field>
                <Field label="Note">
                  <Input value={checkNote} onChange={(event) => setCheckNote(event.target.value)} />
                </Field>
              </div>

              <button
                type="button"
                disabled={busy !== null || odometer.trim() === ""}
                onClick={() =>
                  void call(
                    `${rental._id}/${rental.status === "confirmed" ? "handover" : "return"}`,
                    "POST",
                    {
                      odometer: Number(odometer),
                      // Blank stays blank. `Number("")` is 0, and 0 on a gauge
                      // means empty, which is a charge.
                      fuelEighths: fuel.trim() === "" ? null : Number(fuel),
                      note: checkNote || undefined,
                    },
                    "check",
                  )
                }
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-white hover:bg-brass-bright disabled:opacity-60"
              >
                {busy === "check" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {rental.status === "confirmed" ? "Record the handover" : "Record the return"}
              </button>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-line bg-card p-6">
            <h2 className="font-display text-lg font-semibold">The money</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                [`Rent (${rental.days} × ${pkr(rental.dailyRate)})`, pkr(rental.rentAmount)],
                ["Driver allowance", pkr(rental.driverAllowance)],
                ["Delivery", pkr(rental.deliveryCharge)],
                rental.extraKmAmount
                  ? [`Extra km (${rental.extraKm})`, pkr(rental.extraKmAmount)]
                  : null,
                rental.otherCharges ? ["Other", pkr(rental.otherCharges)] : null,
                rental.discount ? ["Discount", `− ${pkr(rental.discount)}`] : null,
              ]
                .filter(Boolean)
                .map((row) => {
                  const [label, value] = row as [string, string];
                  return (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-muted">{label}</dt>
                      <dd className="font-medium tnum">{value}</dd>
                    </div>
                  );
                })}
              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="font-semibold tnum">{pkr(rental.totalAmount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Advance</dt>
                <dd className="font-medium tnum">{pkr(rental.advancePaid)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Balance</dt>
                <dd className="font-semibold tnum">{pkr(rental.balanceDue)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="text-muted">Deposit held</dt>
                <dd className="font-medium tnum">{pkr(rental.securityDeposit)}</dd>
              </div>
            </dl>

            {listed ? (
              <div className="mt-4 rounded-xl bg-brass-wash p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass">
                  Owed to the car&apos;s owner
                </p>
                <p className="font-display mt-1 text-xl font-semibold text-ink tnum">
                  {pkr(rental.ownerPayout)}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft tnum">
                  {rental.commissionPercent ?? 0}% commission ({pkr(rental.commissionAmount)}) kept.
                </p>
                <p className="mt-1 text-xs font-semibold text-ink-soft">
                  {rental.ownerPaidAt
                    ? `Paid ${shortDate(rental.ownerPaidAt)}.`
                    : rental.status === "returned"
                      ? "Payable now, see Payouts."
                      : "Payable once the car is back."}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-card p-6">
            <h2 className="font-display text-lg font-semibold">The car</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {carLabel(rental.car ?? rental.listedCar)}
              {car?.registrationNumber ? (
                <span className="ms-2 text-xs text-muted tnum">{car.registrationNumber}</span>
              ) : null}
            </p>
            {rental.handover ? (
              <p className="mt-2 text-xs text-muted tnum">
                Out at {rental.handover.odometer.toLocaleString()} km on{" "}
                {shortDate(rental.handover.at)}
              </p>
            ) : null}
            {rental.returned ? (
              <p className="text-xs text-muted tnum">
                Back at {rental.returned.odometer.toLocaleString()} km on{" "}
                {shortDate(rental.returned.at)} · {rental.distanceKm?.toLocaleString()} km driven
              </p>
            ) : null}
            {rental.notes ? (
              <p className="mt-3 whitespace-pre-line border-t border-line pt-3 text-xs leading-relaxed text-ink-soft">
                {rental.notes}
              </p>
            ) : null}
          </section>

          {rental.status !== "returned" ? (
            <section className="rounded-2xl border border-line bg-card p-6">
              <h2 className="font-display text-lg font-semibold">
                {rental.status === "cancelled" ? "Reopen" : "Cancel"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {rental.status === "cancelled"
                  ? "It comes back as an enquiry, whatever the car was doing meanwhile, it was not being held."
                  : rental.status === "out"
                    ? "The car is on the road. Record the return instead."
                    : "This frees the car for anybody else."}
              </p>
              <button
                type="button"
                disabled={busy !== null || rental.status === "out"}
                onClick={() =>
                  void call(
                    `${rental._id}/cancel`,
                    "POST",
                    rental.status === "cancelled" ? { reopen: true } : {},
                    "cancel",
                  )
                }
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-alert/40 px-5 py-2.5 text-sm font-semibold text-alert hover:bg-alert/5 disabled:opacity-40"
              >
                {busy === "cancel" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {rental.status === "cancelled" ? "Reopen the booking" : "Cancel the booking"}
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
};
