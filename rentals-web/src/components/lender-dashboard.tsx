"use client";

import { CalendarRange, Loader2, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvailabilityEditor, cleanWindows, type Window } from "@/components/availability-editor";
import { LenderEarnings, type LenderEarning, type LenderTotals } from "@/components/lender-earnings";
import { Container, Eyebrow } from "@/components/ui";
import { cn } from "@/lib/cn";
import { pkr, shortDate } from "@/lib/format";
import { type ListingOffer, type ListingStatus, ownerDailyShare } from "@/lib/listing";
import { photoSrc } from "@/lib/photos";

export interface LenderCar {
  _id: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  photos: string[];
  status: ListingStatus;
  reviewNote?: string;
  expectedDailyRate?: number;
  publicDailyRate?: number;
  commissionPercent?: number;
  offer?: ListingOffer;
  availability: Window[];
}

export interface LenderUser {
  fullName: string;
  email: string;
  status: "pending" | "active" | "suspended";
}

const STATUS: Record<LenderCar["status"], { label: string; tone: string; help: string }> = {
  pending: {
    label: "With the office",
    tone: "bg-paper-deep text-muted border-line",
    help: "Somebody is looking at it. We will come back to you with a rate.",
  },
  offered: {
    label: "Waiting on you",
    tone: "bg-ink text-paper border-ink",
    help: "We have put a rate to you. Nothing goes on the website until you agree.",
  },
  approved: {
    label: "On the website",
    tone: "bg-paper-deep text-ink border-ink/15",
    help: "Customers can see it on the dates you have offered.",
  },
  rejected: {
    label: "Not listed",
    tone: "bg-alert-wash text-alert border-alert/30",
    help: "We could not list this one.",
  },
  paused: {
    label: "Off the website",
    tone: "bg-paper-deep text-muted border-line",
    help: "Nobody can see it. Add dates or call us to put it back.",
  },
};

/**
 * A car owner's garage.
 *
 * Two jobs, and the second is the one that keeps people coming back: see where
 * each car stands, and change the dates without asking anybody. Editing dates
 * is inline and saves on its own, because "my car is free next week after all"
 * is a thirty-second thought and anything longer than that does not get done.
 */
export const LenderDashboard = ({
  user,
  cars,
  earnings,
  totals,
}: {
  user: LenderUser;
  cars: LenderCar[];
  earnings: LenderEarning[];
  totals: LenderTotals;
}) => {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Window[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [reply, setReply] = useState<Record<string, string>>({});

  /**
   * Answering the office's offer.
   *
   * The note only travels with a decline. On an agreement there is nothing to
   * explain, and asking somebody to justify saying yes is a good way to make
   * them stop.
   */
  const respond = async (id: string, accept: boolean) => {
    setBusy(id);
    await fetch(`/api/lender/cars/${id}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept, note: accept ? undefined : reply[id]?.trim() || undefined }),
    });
    setBusy(null);
    router.refresh();
  };

  const saveDates = async (id: string) => {
    setBusy(id);
    await fetch(`/api/lender/cars/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: cleanWindows(draft) }),
    });
    setBusy(null);
    setEditing(null);
    router.refresh();
  };

  const withdraw = async (id: string) => {
    setBusy(id);
    await fetch(`/api/lender/cars/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  };

  const signOut = async () => {
    await fetch("/api/lender/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  };

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Your cars</Eyebrow>
          <h1 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">
            {user.fullName.split(" ")[0]}&rsquo;s garage
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button data-pressable="control" type="button" onClick={signOut} className="text-sm font-medium text-muted hover:text-ink">
            Sign out
          </button>
          <Link
            href="/lender/cars/new"
            className="inline-flex items-center gap-2 rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-action-deep"
          >
            <Plus className="size-4" aria-hidden />
            Add a car
          </Link>
        </div>
      </div>

      {/* A pending OWNER is different from a pending CAR, and saying so here
          stops the obvious wrong conclusion, that nothing is happening. */}
      {user.status === "pending" ? (
        <p className="mt-6 rounded-2xl border border-line bg-paper-deep p-4 text-sm leading-relaxed text-ink-soft">
          Your account is new, so somebody from the office will call you before your
          first car goes on the website. You can add cars and dates in the meantime.
        </p>
      ) : null}
      {user.status === "suspended" ? (
        <p className="mt-6 rounded-2xl border border-alert/30 bg-alert/5 p-4 text-sm leading-relaxed text-alert">
          This account is on hold and your cars are not being offered. Please call
          the office.
        </p>
      ) : null}

      {cars.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="font-display text-2xl">No cars yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            Add the first one. It takes about two minutes, and nothing goes on the
            website until you and the office have agreed on it.
          </p>
          <Link
            href="/lender/cars/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-paper"
          >
            <Plus className="size-4" aria-hidden />
            Add a car
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {cars.map((car) => {
            const status = STATUS[car.status];
            const isEditing = editing === car._id;
            return (
              <article key={car._id} className="overflow-hidden rounded-2xl border border-line bg-card">
                <div className="flex flex-wrap gap-4 p-5">
                  {car.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoSrc(car.photos[0])}
                      alt=""
                      className="size-24 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-paper-deep">
                      <span className="font-display text-lg text-ink/20">Musafir</span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold">
                        {car.make} {car.model}
                      </h2>
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", status.tone)}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {[car.year, car.color].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-2 text-sm text-ink-soft">{car.reviewNote || status.help}</p>

                    {/* What was agreed, once it has been. Shown on the car
                        rather than buried in earnings, because "what do I get
                        for this one" is a question about this one. */}
                    {car.status === "approved" && car.publicDailyRate && car.commissionPercent !== undefined ? (
                      <p className="mt-1 text-sm text-ink-soft tnum">
                        You keep{" "}
                        <strong className="font-semibold text-ink">
                          {pkr(ownerDailyShare(car.publicDailyRate, car.commissionPercent))}
                        </strong>{" "}
                        a day, after our {car.commissionPercent}% commission.
                      </p>
                    ) : null}

                    {/* Two prices, never conflated: what the owner asked for,
                        and what the car is actually listed at.
                        
                        "Listed at" is tied to being listed, not to the field
                        having a number in it. A car with an offer on the table
                        is not on the website, and one that was taken off still
                        carries the rate it used to have; saying "listed at"
                        for either is telling somebody their car is earning
                        when it is not. */}
                    {car.status === "offered" ? null : (
                      <p className="mt-2 text-sm text-ink-soft tnum">
                        {car.status === "approved" && car.publicDailyRate
                          ? `Listed at ${pkr(car.publicDailyRate)} a day`
                          : car.expectedDailyRate
                            ? `You asked for ${pkr(car.expectedDailyRate)} a day`
                            : "No rate agreed yet"}
                      </p>
                    )}
                  </div>
                </div>

                {/* The offer, and the only thing on this page that is asking
                    the owner for a decision. It sits above the dates because a
                    decision outranks an edit, and it is dark because nothing
                    else on this screen is: a car waiting on you should be
                    findable from across the room. */}
                {car.status === "offered" && car.offer && !car.offer.response ? (
                  <div className="border-t border-line bg-night p-5 text-paper">
                    <p className="t-eyebrow text-amber">Musafir has offered a rent</p>
                    <p className="font-display mt-2 text-2xl font-semibold tnum">
                      {pkr(car.offer.dailyRate)} a day
                    </p>
                    <p className="mt-1 text-sm text-paper/75 tnum">
                      You keep{" "}
                      <strong className="font-semibold text-paper">
                        {pkr(ownerDailyShare(car.offer.dailyRate, car.offer.commissionPercent))}
                      </strong>{" "}
                      of every day it is rented, after our {car.offer.commissionPercent}%
                      commission.
                      {car.offer.kmIncludedPerDay
                        ? ` Includes ${car.offer.kmIncludedPerDay} km a day.`
                        : ""}
                    </p>
                    {car.offer.note ? (
                      <p className="mt-3 rounded-xl bg-paper/10 p-3 text-sm leading-relaxed text-paper/80">
                        {car.offer.note}
                      </p>
                    ) : null}

                    <label className="mt-4 block">
                      <span className="t-caption text-paper/55">
                        Not right? Tell us what would work. Optional, and only sent if you decline.
                      </span>
                      <textarea
                        value={reply[car._id] ?? ""}
                        onChange={(event) =>
                          setReply((current) => ({ ...current, [car._id]: event.target.value }))
                        }
                        rows={2}
                        className="mt-1.5 w-full rounded-xl border border-paper/20 bg-paper/10 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper/40 focus:border-paper/50"
                        placeholder="I was hoping for a bit more on weekends"
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        data-pressable="control"
                        type="button"
                        disabled={busy === car._id}
                        onClick={() => respond(car._id, true)}
                        className="inline-flex items-center gap-2 rounded-full bg-action-invert px-5 py-2.5 text-sm font-semibold text-night disabled:opacity-50"
                      >
                        {busy === car._id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                        Agree, put it on the website
                      </button>
                      <button
                        data-pressable="control"
                        type="button"
                        disabled={busy === car._id}
                        onClick={() => respond(car._id, false)}
                        className="rounded-full border border-paper/30 px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50 hover:bg-paper/10"
                      >
                        Not for me
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* What they said last time, so a second offer has context. */}
                {car.offer?.response === "declined" && car.status !== "offered" ? (
                  <div className="border-t border-line bg-paper-deep px-5 py-3">
                    <p className="t-caption text-muted">
                      You turned down {pkr(car.offer.dailyRate)} a day
                      {car.offer.responseNote ? `: "${car.offer.responseNote}"` : ""}. The office
                      may come back with a different number.
                    </p>
                  </div>
                ) : null}

                <div className="border-t border-line bg-paper/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarRange className="size-4 text-muted" aria-hidden />
                      Free dates
                    </h3>
                    {!isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/lender/cars/${car._id}/edit`}
                          data-pressable="control"
                          className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
                        >
                          Edit this car
                        </Link>
                        <button data-pressable="control"
                          type="button"
                          onClick={() => {
                            setEditing(car._id);
                            setDraft(car.availability.length ? car.availability : [{ from: "", to: "" }]);
                          }}
                          className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
                        >
                          Change dates
                        </button>
                        {car.status !== "paused" ? (
                          <button data-pressable="control"
                            type="button"
                            onClick={() => void withdraw(car._id)}
                            disabled={busy === car._id}
                            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-alert/40 hover:text-alert"
                          >
                            Take it off
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="mt-4">
                      <AvailabilityEditor windows={draft} onChange={setDraft} />
                      <div className="mt-4 flex gap-2">
                        <button data-pressable="control"
                          type="button"
                          onClick={() => void saveDates(car._id)}
                          disabled={busy === car._id}
                          className="inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
                        >
                          {busy === car._id ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Save className="size-4" aria-hidden />
                          )}
                          Save dates
                        </button>
                        <button data-pressable="control"
                          type="button"
                          onClick={() => setEditing(null)}
                          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : car.availability.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">
                      None set. Your car cannot be offered to anybody until you add
                      some.
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {car.availability.map((window, index) => (
                        <li
                          key={index}
                          className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-soft tnum"
                        >
                          {shortDate(window.from)} → {shortDate(window.to)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <LenderEarnings earnings={earnings} totals={totals} />
    </Container>
  );
};
