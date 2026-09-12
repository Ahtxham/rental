"use client";

import { AlertCircle, Check, CheckCircle2, Loader2 } from "lucide-react";
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
/**
 * One car, as something you can choose.
 *
 * Lifted out because the list is now in two pieces and a control that appears
 * twice must behave identically in both, which is not a thing you can promise
 * by copying twenty lines of Tailwind from one branch to the other.
 */
const CarChoice = ({
  car,
  selected,
  onToggle,
}: {
  car: PublicCar;
  selected: boolean;
  onToggle: () => void;
}) => {
  const disabled = car.available === false;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={selected}
      data-pressable="card"
      className={cn(
        // Lifted rather than outlined.
        //
        // A hard ring is a line drawn around a photograph, and it competes
        // with the photograph for the same edge. Raising the card off the page
        // says the same thing using the one language every surface on this
        // site already speaks, and it does not touch the picture at all.
        //
        // The padding is what the shadow needs to fall into; without it the
        // card's own edges clip it.
        "-m-2 w-full rounded-[32px] p-2 text-start",
        "transition-[background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        selected
          ? "bg-card shadow-[0_22px_48px_-20px_rgba(19,19,22,0.45),0_4px_12px_-6px_rgba(19,19,22,0.2)]"
          : disabled
            ? "cursor-not-allowed"
            : "hover:bg-ink/[0.04]",
      )}
    >
      {/* The whole card IS the control here, so it renders without links. */}
      <CarCard car={car} linked={false} />
      {/* Shadow alone is not a state. Somebody scanning quickly, or on a
          screen where the shadow is washed out by sunlight, needs a word. */}
      {selected ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Check className="size-3.5" aria-hidden />
          Chosen
        </p>
      ) : null}
    </button>
  );
};

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

  /**
   * The car at the top of the list, and why it is pinned there.
   *
   * If the visitor arrived from a car's own page, that car holds the top slot
   * for as long as they are here, whether or not it is currently selected.
   * They came to look at that one; moving it back into the grid the moment
   * they clear the tick would mean hunting for it again among four others, and
   * the page would have quietly thrown away the only thing it knew about why
   * they are on it.
   *
   * With no car in the URL there is nothing to pin, so the slot falls back to
   * whatever they have chosen, which rises out of the grid as they pick it.
   */
  const arrived = initialCarId ? (cars.find((car) => car.id === initialCarId) ?? null) : null;
  const featured = arrived ?? chosen;
  const others = featured ? cars.filter((car) => car.id !== featured.id) : cars;
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
          <CheckCircle2 className="mx-auto size-10 text-ink" aria-hidden />
          <h1 className="font-display mt-4 text-3xl font-semibold">Request sent</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            We have your dates and we will call you back to confirm the car and
            the price. Nothing is charged and no car is held until you have said
            yes to both.
          </p>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Your reference
          </p>
          <p className="font-display text-2xl font-semibold tracking-[0.2em] text-ink tnum">
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

      {/* Says out loud that the choice survived the journey.
      
          Somebody who pressed "Book" on a car and landed on a page headed
          "tell us the dates" has no reason to believe the car came with them,
          and the only place that says otherwise is a summary panel that sits
          below the fold on a phone. The car is named here, where the eye
          already is, as soon as the list has loaded and confirmed it is real.
          Nothing is asserted before then: a car named from a URL that turns
          out not to exist is worse than saying nothing. */}
      {initialCarId && chosen ? (
        <p className="note-enter mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
          You picked the{" "}
          <strong className="font-semibold text-ink">
            {chosen.make} {chosen.model}
          </strong>
          {datesReady
            ? ", and your dates came with you. Change either one below."
            : ". Choose your dates and we will price it, or pick a different car below."}
        </p>
      ) : null}

      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-10">
          {/* 1, dates */}
          <section>
            <h2 className="font-display flex items-baseline gap-3 text-2xl font-semibold">
              <span className="text-ink/15 tnum">01</span> When do you need it?
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
              <span className="text-ink/15 tnum">02</span> Which car?
            </h2>
            <p className="mt-2 text-sm text-muted">
              {datesReady
                ? "Anything marked taken is already out on those dates."
                : "Pick your dates above and this list will show what is actually free."}
            </p>

            {selfDriveEnabled ? (
              // The same control as the one on the front page, because it
              // asks the same question. Two different-looking switches for one
              // choice is two things to learn instead of one.
              <div
                className="mt-4 inline-flex rounded-full bg-ink/[0.06] p-1"
                role="radiogroup"
                aria-label="How you will drive"
              >
                {[
                  { value: true, label: "With a driver" },
                  { value: false, label: "Self-drive" },
                ].map((option) => {
                  const disabled = !option.value && !canSelfDrive;
                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="radio"
                      disabled={disabled}
                      onClick={() => setWithDriver(option.value)}
                      aria-checked={withDriver === option.value}
                      data-pressable="control"
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-semibold",
                        withDriver === option.value
                          ? "bg-card text-ink shadow-[0_1px_2px_rgba(16,22,20,0.16)]"
                          : "text-ink-soft hover:text-ink",
                        disabled && "cursor-not-allowed opacity-40",
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
              <p className="mt-3 flex gap-2 rounded-xl border border-line bg-paper-deep p-3 text-xs leading-relaxed text-ink-soft">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
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
              <>
                {/* The chosen car, alone and first.
                
                    Sitting in the grid it was one ringed card among five, and
                    on a phone it could be two screens below the thing that
                    said a car had been chosen at all. A decision that has been
                    made should not have to be hunted for among the decisions
                    that have not. */}
                {featured ? (
                  <div className="mt-6">
                    <h3 className="t-eyebrow text-amber-ink">
                      {carId === featured.id
                        ? "Your car"
                        : arrived
                          ? "The car you came for"
                          : "Your car"}
                    </h3>

                    {/* Not a button, unlike the cards in the grid below.
                    
                        This one carries a slider, and a slider inside a button
                        means the tap you meant for the next photograph selects
                        the car instead. So the card shows, and one plain
                        control underneath it decides. */}
                    <div
                      className={cn(
                        "mt-3 rounded-[32px] p-3 sm:max-w-md",
                        "transition-[background-color,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                        carId === featured.id
                          ? "bg-card shadow-[0_22px_48px_-20px_rgba(19,19,22,0.45),0_4px_12px_-6px_rgba(19,19,22,0.2)]"
                          : "bg-ink/[0.03]",
                      )}
                    >
                      <CarCard car={featured} linked={false} gallery />

                      <button
                        type="button"
                        data-pressable="control"
                        disabled={featured.available === false}
                        onClick={() => setCarId(carId === featured.id ? "" : featured.id)}
                        className={cn(
                          "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold",
                          "disabled:cursor-not-allowed disabled:opacity-40",
                          carId === featured.id
                            ? "border border-ink/20 text-ink hover:bg-ink/5"
                            : "bg-action text-white hover:bg-action-deep",
                        )}
                      >
                        {carId === featured.id ? (
                          <>
                            <Check className="size-4" aria-hidden />
                            Chosen, tap to clear
                          </>
                        ) : featured.available === false ? (
                          "Taken on these dates"
                        ) : (
                          "Choose this car"
                        )}
                      </button>
                    </div>
                  </div>
                ) : null}

                {others.length > 0 ? (
                  <div className={featured ? "mt-10" : "mt-6"}>
                    {featured ? (
                      <h3 className="t-eyebrow text-amber-ink">
                        {datesReady ? "Other cars on those dates" : "Other cars"}
                      </h3>
                    ) : null}
                    <div className={cn("grid gap-5 sm:grid-cols-2", featured && "mt-3")}>
                      {others.map((car) => (
                        <CarChoice
                          key={car.id}
                          car={car}
                          selected={carId === car.id}
                          onToggle={() => setCarId(carId === car.id ? "" : car.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
            <p className="mt-4 text-xs text-muted">
              Not fussy? Leave this blank and we will give you the best car free
              on your dates.
            </p>
          </section>

          {/* 3, who you are */}
          <section>
            <h2 className="font-display flex items-baseline gap-3 text-2xl font-semibold">
              <span className="text-ink/15 tnum">03</span> How do we reach you?
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
                  <span className="font-display text-2xl font-semibold text-ink tnum">
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
                className="note-enter mt-4 flex gap-2 rounded-xl border border-alert/30 bg-alert/5 p-3 text-xs text-alert"
                role="alert"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}

            <button data-pressable="control"
              type="submit"
              disabled={sending}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-action-deep disabled:cursor-not-allowed disabled:opacity-60"
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
                className="font-semibold text-ink underline underline-offset-4"
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
