"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CarCard } from "@/components/car-card";
import { Button, Container, Eyebrow, Field, Input, Textarea } from "@/components/ui";
import type { PublicCar, Quote } from "@/lib/api";
import { cn } from "@/lib/cn";
import { pkr, rentalDays, shortDate } from "@/lib/format";

/**
 * The booking request, end to end.
 *
 * Dates first, then the car, then who you are, the order a customer thinks in,
 * and the order that lets the middle step answer with real availability instead
 * of a list of cars they might not be able to have.
 *
 * What this page does NOT do is take a car off the road. Everything sent from
 * here lands as an enquiry: a stranger on the internet cannot hold a vehicle,
 * and the office confirms every booking by hand. The copy says so plainly,
 * because a customer who thinks they have booked a car and finds out otherwise
 * on Thursday morning is a customer lost for good.
 */
const KARACHI = "+05:00";
const instant = (ymd: string, hhmm: string) => `${ymd}T${hhmm}:00${KARACHI}`;

export const BookingFlow = ({
  initialFrom,
  initialTo,
  initialCarId,
  initialSelfDrive = false,
  selfDriveEnabled = false,
}: {
  initialFrom?: string;
  initialTo?: string;
  initialCarId?: string;
  initialSelfDrive?: boolean;
  /** Business-wide. A car may still not offer it, see `canSelfDrive`. */
  selfDriveEnabled?: boolean;
}) => {
  const today = new Date().toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(initialFrom ?? "");
  const [fromTime, setFromTime] = useState("10:00");
  const [toDate, setToDate] = useState(initialTo ?? "");
  const [toTime, setToTime] = useState("10:00");

  const [cars, setCars] = useState<PublicCar[]>([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [carId, setCarId] = useState(initialCarId ?? "");

  const [withDriver, setWithDriver] = useState(!(selfDriveEnabled && initialSelfDrive));
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const datesReady = Boolean(
    fromDate && toDate && new Date(instant(toDate, toTime)) > new Date(instant(fromDate, fromTime)),
  );
  const from = datesReady ? instant(fromDate, fromTime) : "";
  const to = datesReady ? instant(toDate, toTime) : "";
  const days = datesReady ? rentalDays(from, to) : 0;

  const chosen = cars.find((car) => car.id === carId) ?? null;
  const canSelfDrive = selfDriveEnabled && (!chosen || Boolean(chosen.selfDriveRate));

  const loadCars = useCallback(async () => {
    setLoadingCars(true);
    const query = datesReady ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
    try {
      const response = await fetch(`/api/cars${query}`, { cache: "no-store" });
      const body = (await response.json()) as { data?: PublicCar[] };
      setCars(body.data ?? []);
    } catch {
      setCars([]);
    }
    setLoadingCars(false);
  }, [datesReady, from, to]);

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  // A car that has just become unavailable for the chosen dates should not stay
  // selected underneath the summary, that is how somebody sends a request for
  // a car the page has already told them they cannot have.
  useEffect(() => {
    if (!carId) return;
    const car = cars.find((entry) => entry.id === carId);
    if (car && car.available === false) setCarId("");
  }, [cars, carId]);

  // Picking a car that is chauffeur-only silently flips the mode back, because
  // leaving "self-drive" selected would price and send something we do not do.
  useEffect(() => {
    if (!withDriver && !canSelfDrive) setWithDriver(true);
  }, [withDriver, canSelfDrive]);

  /**
   * The price, from the server that will actually charge it.
   *
   * Not computed here: a rental day is 24 hours rounded up with an hour of
   * grace, and a second implementation of that rule is a second chance to
   * quote a number the invoice will not match.
   */
  useEffect(() => {
    if (!datesReady || !carId) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId, startAt: from, endAt: to, withDriver }),
        });
        const body = (await response.json()) as { data?: Quote };
        if (!cancelled) setQuote(response.ok ? (body.data ?? null) : null);
      } catch {
        if (!cancelled) setQuote(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [carId, from, to, withDriver, datesReady]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!datesReady) {
      setError("Please choose when you need the car and when you will bring it back.");
      return;
    }
    if (fullName.trim().length < 2 || phone.trim().length < 7) {
      setError("We need your name and a number we can call you on.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          carId: carId || undefined,
          withDriver,
          startAt: from,
          endAt: to,
          notes: notes.trim() || undefined,
        }),
      });
      const body = (await response.json()) as { data?: { reference: string }; message?: string };
      if (!response.ok) {
        setError(body.message ?? "That did not send. Please call or WhatsApp us.");
      } else {
        setReference(body.data?.reference ?? "SENT");
      }
    } catch {
      setError("That did not send. Please call or WhatsApp us.");
    }
    setSending(false);
  };

  if (reference) {
    return (
      <Container className="py-20">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-forest" aria-hidden />
          <h1 className="font-display mt-4 text-3xl font-semibold">Request sent</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            We have your dates and we will call you back to confirm the car and
            the price. Nothing is charged and no car is held until you have said
            yes to both.
          </p>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Your reference
          </p>
          <p className="font-display text-2xl font-semibold tracking-[0.2em] text-forest tnum">
            {reference}
          </p>
          <Button href="/" className="mt-7">
            Back to the start
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <Eyebrow>Book a car</Eyebrow>
      <h1 className="font-display mt-3 max-w-2xl text-4xl font-semibold sm:text-5xl">
        Tell us the dates and we will tell you what is free
      </h1>

      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          {/* 1, dates */}
          <section>
            <h2 className="font-display flex items-baseline gap-3 text-2xl font-semibold">
              <span className="text-brass/50 tnum">01</span> When do you need it?
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Pick-up">
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={fromDate}
                    min={today}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="tnum"
                  />
                  <Input
                    type="time"
                    value={fromTime}
                    onChange={(event) => setFromTime(event.target.value)}
                    className="w-28 tnum"
                  />
                </div>
              </Field>
              <Field label="Return">
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={toDate}
                    min={fromDate || today}
                    onChange={(event) => setToDate(event.target.value)}
                    className="tnum"
                  />
                  <Input
                    type="time"
                    value={toTime}
                    onChange={(event) => setToTime(event.target.value)}
                    className="w-28 tnum"
                  />
                </div>
              </Field>
            </div>
            {datesReady ? (
              <p className="mt-3 text-sm text-muted tnum">
                {shortDate(from)} to {shortDate(to)}, {days} {days === 1 ? "day" : "days"}. A day
                is 24 hours, with an hour of grace on the return.
              </p>
            ) : null}
          </section>

          {/* 2, the car */}
          <section>
            <h2 className="font-display flex items-baseline gap-3 text-2xl font-semibold">
              <span className="text-brass/50 tnum">02</span> Which car?
            </h2>
            <p className="mt-2 text-sm text-muted">
              {datesReady
                ? "Anything marked taken is already out on those dates."
                : "Pick your dates above and this list will show what is actually free."}
            </p>

            {selfDriveEnabled ? (
              <div className="mt-4 flex gap-2">
                {[
                  { value: true, label: "With a driver" },
                  { value: false, label: "Self-drive" },
                ].map((option) => {
                  const disabled = !option.value && !canSelfDrive;
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      disabled={disabled}
                      onClick={() => setWithDriver(option.value)}
                      aria-pressed={withDriver === option.value}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150",
                        withDriver === option.value
                          ? "border-forest bg-forest text-paper"
                          : "border-line text-ink-soft hover:border-forest/40",
                        disabled && "cursor-not-allowed opacity-40 hover:border-line",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {selfDriveEnabled && !canSelfDrive && chosen ? (
              <p className="mt-3 text-xs text-muted">
                The {chosen.make} {chosen.model} goes out with one of our drivers only.
              </p>
            ) : null}

            {selfDriveEnabled && !withDriver ? (
              <p className="mt-3 flex gap-2 rounded-xl border border-brass/30 bg-brass-wash p-3 text-xs leading-relaxed text-ink-soft">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden />
                Self-drive needs a valid licence, your original CNIC and a larger
                refundable deposit. We confirm all three before the keys change
                hands.
              </p>
            ) : null}

            {loadingCars ? (
              <p className="mt-6 flex items-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Checking what is free…
              </p>
            ) : cars.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-line p-6 text-sm text-muted">
                We could not load the list just now. Send the form anyway, the
                dates are what matter, and we will come back with a car.
              </p>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {cars.map((car) => {
                  const disabled = car.available === false;
                  const selected = carId === car.id;
                  return (
                    <button
                      key={car.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setCarId(selected ? "" : car.id)}
                      aria-pressed={selected}
                      className={cn(
                        "rounded-2xl text-start transition-shadow duration-150",
                        selected && "ring-2 ring-forest ring-offset-2 ring-offset-paper",
                        disabled ? "cursor-not-allowed" : "hover:shadow-md",
                      )}
                    >
                      {/* The whole card IS the control here, so the card
                          renders without its own links. */}
                      <CarCard car={car} linked={false} />
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-xs text-muted">
              Not fussy? Leave this blank and we will give you the best car free
              on your dates.
            </p>
          </section>

          {/* 3, who you are */}
          <section>
            <h2 className="font-display flex items-baseline gap-3 text-2xl font-semibold">
              <span className="text-brass/50 tnum">03</span> How do we reach you?
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </Field>
              <Field label="Phone">
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  placeholder="03xx xxxxxxx"
                  className="tnum"
                />
              </Field>
              <Field label="Email (optional)" className="sm:col-span-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field label="Anything we should know?" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Airport pickup at 6am, going to Islamabad, need a booster seat…"
                />
              </Field>
            </div>
          </section>
        </div>

        {/* The summary. Sticky on a desktop because it is the thing being
            agreed to, and it has to stay visible while the form is filled. */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-2xl border border-line bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Your request</h2>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Dates</dt>
                <dd className="text-end font-medium tnum">
                  {datesReady ? `${shortDate(from)} → ${shortDate(to)}` : "Not chosen"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Length</dt>
                <dd className="font-medium tnum">
                  {days ? `${days} ${days === 1 ? "day" : "days"}` : "-"}
                </dd>
              </div>
              {selfDriveEnabled ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Driving</dt>
                  <dd className="font-medium">{withDriver ? "One of ours" : "You"}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Car</dt>
                <dd className="text-end font-medium">
                  {chosen ? `${chosen.make} ${chosen.model}` : "Whatever is free"}
                </dd>
              </div>
            </dl>

            {quote ? (
              <div className="mt-4 border-t border-line pt-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted tnum">
                      {quote.days} × {pkr(quote.dailyRate)}
                    </dt>
                    <dd className="font-medium tnum">{pkr(quote.rentAmount)}</dd>
                  </div>
                  {quote.kmIncluded ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Kilometres included</dt>
                      <dd className="font-medium tnum">{quote.kmIncluded} km</dd>
                    </div>
                  ) : null}
                  {quote.extraKmRate ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Each km over</dt>
                      <dd className="font-medium tnum">{pkr(quote.extraKmRate)}</dd>
                    </div>
                  ) : null}
                  {quote.securityDeposit ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Deposit, refundable</dt>
                      <dd className="font-medium tnum">{pkr(quote.securityDeposit)}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
                  <span className="text-sm font-semibold">Rent for the booking</span>
                  <span className="font-display text-2xl font-semibold text-forest tnum">
                    {pkr(quote.rentAmount)}
                  </span>
                </div>
                {/* Said before it is asked, because a number that looks like a
                    bill would be a promise nobody has made yet. */}
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{quote.note}</p>
              </div>
            ) : null}

            {error ? (
              <p
                className="mt-4 flex gap-2 rounded-xl border border-alert/30 bg-alert/5 p-3 text-xs text-alert"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={sending}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brass px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brass-bright disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Send the request
            </button>

            <p className="mt-3 text-center text-xs leading-relaxed text-muted">
              This sends your dates to the office. It does not hold a car and
              nothing is charged, we call you back to confirm both.
            </p>

            <p className="mt-4 border-t border-line pt-4 text-center text-xs text-muted">
              In a hurry?{" "}
              <Link
                href="/contact"
                className="font-semibold text-forest underline underline-offset-4"
              >
                Call us instead
              </Link>
            </p>
          </div>
        </aside>
      </form>
    </Container>
  );
};
