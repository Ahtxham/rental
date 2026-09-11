"use client";

import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PhotoUploader } from "@/components/photo-uploader";
import { photoSrc } from "@/lib/photos";
import { Badge, Field, Input, Switch, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { AdminCar } from "@/lib/admin-types";
import { pkr } from "@/lib/format";

/**
 * Add or edit one of Musafir's own cars.
 *
 * The `listed` switch is the only thing on this form a customer ever sees, so
 * it is deliberately not a checkbox lost among twenty fields, and the backend
 * refuses to publish a car with no rate on it, which is the one validation
 * worth failing loudly rather than hiding the car.
 */
const FUELS = ["petrol", "diesel", "cng", "hybrid", "electric"] as const;

const number = (value: string) => (value.trim() === "" ? undefined : Number(value));

export const CarEditor = ({
  car,
  onDone,
}: {
  car?: AdminCar;
  onDone: () => void;
}) => {
  const router = useRouter();
  const [form, setForm] = useState({
    registrationNumber: car?.registrationNumber ?? "",
    make: car?.make ?? "",
    model: car?.model ?? "",
    year: String(car?.year ?? ""),
    color: car?.color ?? "",
    seats: String(car?.seats ?? 5),
    fuelType: car?.fuelType ?? "petrol",
    transmission: car?.transmission ?? "automatic",
    currentOdometer: String(car?.currentOdometer ?? ""),
    status: car?.status ?? "active",
    listed: car?.listed ?? false,
    withDriverRate: String(car?.withDriverRate ?? ""),
    selfDriveRate: String(car?.selfDriveRate ?? ""),
    kmIncludedPerDay: String(car?.kmIncludedPerDay ?? ""),
    extraKmRate: String(car?.extraKmRate ?? ""),
    description: car?.description ?? "",
    features: (car?.features ?? []).join(", "),
  });
  /**
   * Photos are separate state because they are already uploaded by the time
   * they appear here. The uploader sends each file as it is picked and hands
   * back a URL, so this form only ever submits strings, and a photo that fails
   * fails on its own instead of taking a whole save with it.
   */
  const [photos, setPhotos] = useState<string[]>(car?.photos ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        car ? `/api/admin/cars/${car._id}` : "/api/admin/cars",
        {
          method: car ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registrationNumber: form.registrationNumber.trim().toUpperCase(),
            make: form.make.trim(),
            model: form.model.trim(),
            year: number(form.year),
            color: form.color.trim() || undefined,
            seats: number(form.seats) ?? 5,
            fuelType: form.fuelType,
            transmission: form.transmission,
            currentOdometer: number(form.currentOdometer) ?? 0,
            status: form.status,
            listed: form.listed,
            withDriverRate: number(form.withDriverRate),
            selfDriveRate: number(form.selfDriveRate),
            kmIncludedPerDay: number(form.kmIncludedPerDay),
            extraKmRate: number(form.extraKmRate),
            photos,
            description: form.description.trim() || undefined,
            features: form.features
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean),
          }),
        },
      );
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not work.");
      } else {
        onDone();
        router.refresh();
      }
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-card p-6">
      <h2 className="font-display text-xl font-semibold">
        {car ? `${car.make} ${car.model}` : "Add a car"}
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Field label="Registration">
          <Input
            value={form.registrationNumber}
            onChange={(event) => set("registrationNumber", event.target.value)}
            required
            className="uppercase tnum"
          />
        </Field>
        <Field label="Make">
          <Input value={form.make} onChange={(event) => set("make", event.target.value)} required />
        </Field>
        <Field label="Model">
          <Input
            value={form.model}
            onChange={(event) => set("model", event.target.value)}
            required
          />
        </Field>
        <Field label="Year">
          <Input
            type="number"
            value={form.year}
            onChange={(event) => set("year", event.target.value)}
            className="tnum"
          />
        </Field>
        <Field label="Colour">
          <Input value={form.color} onChange={(event) => set("color", event.target.value)} />
        </Field>
        <Field label="Seats">
          <Input
            type="number"
            min={1}
            value={form.seats}
            onChange={(event) => set("seats", event.target.value)}
            className="tnum"
          />
        </Field>
        <Field label="Fuel">
          <select
            value={form.fuelType}
            onChange={(event) => set("fuelType", event.target.value)}
            className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink"
          >
            {FUELS.map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuel}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gearbox">
          <select
            value={form.transmission}
            onChange={(event) => set("transmission", event.target.value as "manual" | "automatic")}
            className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink"
          >
            <option value="automatic">automatic</option>
            <option value="manual">manual</option>
          </select>
        </Field>
        <Field label="Odometer">
          <Input
            type="number"
            min={0}
            value={form.currentOdometer}
            onChange={(event) => set("currentOdometer", event.target.value)}
            className="tnum"
          />
        </Field>
        <Field label="Condition" hint="Maintenance takes it off the board without deleting it.">
          <select
            value={form.status}
            onChange={(event) => set("status", event.target.value as AdminCar["status"])}
            className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink"
          >
            <option value="active">active</option>
            <option value="maintenance">in for service</option>
            <option value="inactive">off the road</option>
          </select>
        </Field>
        <Field label="Features" className="sm:col-span-2" hint="Comma separated. These show on the card.">
          <Input
            value={form.features}
            onChange={(event) => set("features", event.target.value)}
            placeholder="Air conditioning, Two suitcases"
          />
        </Field>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Photos
        </p>
        <div className="mt-2">
          <PhotoUploader
            photos={photos}
            onChange={setPhotos}
            endpoint="/api/admin/upload"
            hint="The first one is the card on the website. Outside three-quarter view first, then the interior and the boot. A car with no photo falls back to a plain Musafir tile, which rents a lot less often."
          />
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.listed}
            onChange={(event) => set("listed", event.target.checked)}
            className="mt-1 size-4 accent-[#1d1d20]"
          />
          <span>
            <span className="text-sm font-semibold text-ink">Show this car on musafircars.com</span>
            <span className="mt-0.5 block text-xs text-muted">
              A published car needs a daily rate. Saving without one is refused
              rather than quietly hiding the car.
            </span>
          </span>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Field label="With a driver, per day">
            <Input
              type="number"
              min={0}
              value={form.withDriverRate}
              onChange={(event) => set("withDriverRate", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="Self-drive, per day" hint="Leave blank to not offer it on this car.">
            <Input
              type="number"
              min={0}
              value={form.selfDriveRate}
              onChange={(event) => set("selfDriveRate", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="Km included per day">
            <Input
              type="number"
              min={0}
              value={form.kmIncludedPerDay}
              onChange={(event) => set("kmIncludedPerDay", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="Each km over">
            <Input
              type="number"
              min={0}
              value={form.extraKmRate}
              onChange={(event) => set("extraKmRate", event.target.value)}
              className="tnum"
            />
          </Field>
          <Field label="One line about the car" className="sm:col-span-4">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="The default choice for a day of meetings or an airport run."
            />
          </Field>
        </div>
      </div>

      {error ? (
        <p className="mt-4 flex gap-2 text-sm text-alert" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-paper hover:bg-action-deep disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {car ? "Save" : "Add the car"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

/** The list, with the editor opening in place of a row rather than in a modal. */
export const CarManager = ({ cars }: { cars: AdminCar[] }) => {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * Which switches have been flipped but not yet confirmed by the server.
   *
   * The toggle answers on the press and is put back if the save fails. A
   * switch that waits for a round trip before moving reads as broken, and the
   * failure this protects against, publishing a car with no rate, is one the
   * backend refuses outright rather than one that half succeeds.
   */
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const toggleListed = async (car: AdminCar, next: boolean) => {
    setPending((current) => ({ ...current, [car._id]: next }));
    setError(null);
    try {
      const response = await fetch(`/api/admin/cars/${car._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listed: next }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not work.");
        setPending((current) => {
          const { [car._id]: _dropped, ...rest } = current;
          return rest;
        });
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
      setPending((current) => {
        const { [car._id]: _dropped, ...rest } = current;
        return rest;
      });
    }
  };

  const remove = async (id: string) => {
    setRemoving(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/cars/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) setError(body.message ?? "That did not work.");
      else router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setRemoving(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Cars</h1>
          <p className="mt-1 text-sm text-muted">
            {cars.filter((car) => car.listed).length} of {cars.length} on the website.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(editing === "new" ? null : "new")}
          className="inline-flex items-center gap-2 rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-action-deep"
        >
          <Plus className="size-4" aria-hidden />
          Add a car
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm text-alert" role="alert">
          {error}
        </p>
      ) : null}

      {editing === "new" ? <CarEditor onDone={() => setEditing(null)} /> : null}

      <div className="space-y-3">
        {cars.map((car) =>
          editing === car._id ? (
            <CarEditor key={car._id} car={car} onDone={() => setEditing(null)} />
          ) : (
            <div
              key={car._id}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-line bg-card px-5 py-4"
            >
              {/* The thumbnail is here so "which cars still have no picture"
                  is answered by looking rather than by opening each one. */}
              {car.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoSrc(car.photos[0])}
                  alt=""
                  className="size-12 shrink-0 rounded-lg border border-line object-cover"
                />
              ) : (
                <span
                  className="car-placeholder flex size-12 shrink-0 items-center justify-center rounded-lg text-[9px] font-semibold text-paper/70"
                  title="No photo yet"
                >
                  No photo
                </span>
              )}
              <div className="min-w-44 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {car.make} {car.model}
                </p>
                <p className="text-xs text-muted tnum">
                  {[car.registrationNumber, car.year, car.color].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="min-w-28 text-sm tnum">{pkr(car.withDriverRate)}</p>
              <p className="min-w-28 text-sm text-muted tnum">
                {car.selfDriveRate ? `${pkr(car.selfDriveRate)} self` : "no self-drive"}
              </p>
              <p className="min-w-24 text-xs text-muted tnum">
                {car.currentOdometer.toLocaleString()} km
              </p>
              {/* Bookable or not, in one press. `listed` is what puts a car on
                  musafircars.com and so what makes it bookable at all. */}
              <div className="flex min-w-40 items-center gap-2.5">
                <Switch
                  checked={pending[car._id] ?? car.listed}
                  onChange={(next) => void toggleListed(car, next)}
                  label={`Show ${car.make} ${car.model} on the website`}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    (pending[car._id] ?? car.listed) ? "text-ink" : "text-muted",
                  )}
                >
                  {(pending[car._id] ?? car.listed) ? "Bookable" : "Off the site"}
                </span>
              </div>
              {/* A listed car in for service still does not appear, because the
                  public list asks for `status: active`. Saying so here stops
                  somebody flipping the switch back and forth wondering why. */}
              {car.status !== "active" ? (
                <Badge tone="warn">
                  {car.status === "maintenance" ? "in for service" : "off the road"}
                </Badge>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(car._id)}
                  className="rounded-full border border-ink/20 px-4 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={removing === car._id}
                  onClick={() => void remove(car._id)}
                  aria-label={`Remove ${car.make} ${car.model}`}
                  className={cn(
                    "rounded-full border border-alert/30 p-2 text-alert hover:bg-alert/5",
                    removing === car._id && "opacity-50",
                  )}
                >
                  {removing === car._id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden />
                  )}
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      {cars.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-sm text-muted">
          No cars yet. Add one, give it a rate, and switch it on to put it on the
          website.
        </p>
      ) : null}
    </div>
  );
};
