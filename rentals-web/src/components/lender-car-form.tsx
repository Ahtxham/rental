"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvailabilityEditor, cleanWindows, type Window } from "@/components/availability-editor";
import { PhotoUploader } from "@/components/photo-uploader";
import { Container, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/cn";

const FUELS = ["petrol", "diesel", "cng", "hybrid", "electric"] as const;

/**
 * Offering a car.
 *
 * Asks for the least that lets the office make a decision and a customer make
 * a choice: what the car is, what it looks like, when it is free, and what the
 * owner hopes to be paid. Everything else, the customer's price, the
 * kilometre allowance, is agreed in the conversation that follows, and asking
 * for it here would imply the owner sets it.
 */
export const LenderCarForm = () => {
  const router = useRouter();
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [seats, setSeats] = useState("4");
  const [fuelType, setFuelType] = useState<(typeof FUELS)[number]>("petrol");
  const [transmission, setTransmission] = useState<"manual" | "automatic">("manual");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [description, setDescription] = useState("");
  const [expectedDailyRate, setExpectedDailyRate] = useState("");
  const [driverBy, setDriverBy] = useState<"fleet" | "owner">("fleet");
  const [photos, setPhotos] = useState<string[]>([]);
  const [windows, setWindows] = useState<Window[]>([{ from: "", to: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = "mt-1.5 w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-ink/20";
  const label = "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!make.trim() || !model.trim() || !registrationNumber.trim()) {
      setError("We need the make, the model and the registration number.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/lender/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: make.trim(),
          model: model.trim(),
          year: year ? Number(year) : undefined,
          color: color.trim() || undefined,
          seats: Number(seats) || 4,
          fuelType,
          transmission,
          registrationNumber: registrationNumber.trim().toUpperCase(),
          description: description.trim() || undefined,
          expectedDailyRate: expectedDailyRate ? Number(expectedDailyRate) : undefined,
          driverBy,
          photos,
          availability: cleanWindows(windows),
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not save.");
        setBusy(false);
        return;
      }
      router.refresh();
      router.push("/lender");
    } catch {
      setError("That did not save. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>Your car</Eyebrow>
        <h1 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">Tell us about it</h1>

        <form onSubmit={submit} className="mt-8 space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold">The car</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>Make</span>
                <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" className={field} />
              </label>
              <label className="block">
                <span className={label}>Model</span>
                <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Corolla GLi" className={field} />
              </label>
              <label className="block">
                <span className={label}>Year</span>
                <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2020" className={`${field} tnum`} />
              </label>
              <label className="block">
                <span className={label}>Colour</span>
                <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="White" className={field} />
              </label>
              <label className="block">
                <span className={label}>Seats</span>
                <input value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={`${field} tnum`} />
              </label>
              <label className="block">
                <span className={label}>Fuel</span>
                <select value={fuelType} onChange={(e) => setFuelType(e.target.value as (typeof FUELS)[number])} className={field}>
                  {FUELS.map((fuel) => (
                    <option key={fuel} value={fuel}>
                      {fuel[0].toUpperCase() + fuel.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <span className={label}>Transmission</span>
                <div className="mt-1.5 flex gap-2">
                  {(["manual", "automatic"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTransmission(option)}
                      aria-pressed={transmission === option}
                      className={cn(
                        "flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition-colors",
                        transmission === option
                          ? "border-ink/20 bg-night text-paper"
                          : "border-line text-ink-soft hover:border-line",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block sm:col-span-2">
                <span className={label}>Registration number</span>
                <input
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="LEB-1234"
                  className={`${field} tnum`}
                />
                {/* The one field owners hesitate over, answered where they
                    hesitate rather than in a policy page. */}
                <span className="mt-1 block text-xs text-muted">
                  For our records only. It is never shown on the website.
                </span>
              </label>
              <label className="block sm:col-span-2">
                <span className={label}>Anything worth saying about it</span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kept in a garage, new tyres, only used at weekends."
                  className={field}
                />
              </label>
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Photos</h2>
            <div className="mt-4">
              <PhotoUploader photos={photos} onChange={setPhotos} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">When is it free?</h2>
            <p className="mt-1 text-sm text-muted">
              Your car is only offered inside these dates, and a booking has to fit
              inside one of them. You can change this whenever you like.
            </p>
            <div className="mt-4">
              <AvailabilityEditor windows={windows} onChange={setWindows} />
            </div>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Money and driving</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={label}>What you hope to earn, per day (₨)</span>
                <input
                  value={expectedDailyRate}
                  onChange={(e) => setExpectedDailyRate(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="7000"
                  className={`${field} tnum`}
                />
                <span className="mt-1 block text-xs text-muted">
                  A starting point, not a commitment. We will agree the final figure
                  with you.
                </span>
              </label>
              <div>
                <span className={label}>Who drives it</span>
                <div className="mt-1.5 flex gap-2">
                  {(
                    [
                      { value: "fleet", label: "Musafir's driver" },
                      { value: "owner", label: "I will drive it" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDriverBy(option.value)}
                      aria-pressed={driverBy === option.value}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                        driverBy === option.value
                          ? "border-ink/20 bg-night text-paper"
                          : "border-line text-ink-soft hover:border-line",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <p className="flex gap-2 rounded-xl border border-alert/30 bg-alert/5 p-3 text-sm text-alert" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-action-deep disabled:opacity-60 sm:w-auto"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Send for review
          </button>
        </form>
      </div>
    </Container>
  );
};
