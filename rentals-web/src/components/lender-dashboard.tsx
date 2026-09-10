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
import { photoSrc } from "@/lib/photos";

export interface LenderCar {
  _id: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  photos: string[];
  status: "pending" | "approved" | "rejected" | "paused";
  reviewNote?: string;
  expectedDailyRate?: number;
  publicDailyRate?: number;
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
    tone: "bg-brass-wash text-brass border-brass/30",
    help: "Somebody is looking at it. We will call you to agree a rate.",
  },
  approved: {
    label: "On the website",
    tone: "bg-forest-soft text-forest border-forest/20",
    help: "Customers can see it on the dates you have offered.",
  },
  rejected: {
    label: "Not listed",
    tone: "bg-alert/10 text-alert border-alert/30",
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
          <button type="button" onClick={signOut} className="text-sm font-medium text-muted hover:text-ink">
            Sign out
          </button>
          <Link
            href="/lender/cars/new"
            className="inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brass-bright"
          >
            <Plus className="size-4" aria-hidden />
            Add a car
          </Link>
        </div>
      </div>

      {/* A pending OWNER is different from a pending CAR, and saying so here
          stops the obvious wrong conclusion, that nothing is happening. */}
      {user.status === "pending" ? (
        <p className="mt-6 rounded-2xl border border-brass/30 bg-brass-wash p-4 text-sm leading-relaxed text-ink-soft">
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
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper"
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
                      <span className="font-display text-lg text-forest/25">Musafir</span>
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

                    {/* Two prices, never conflated: what the owner asked for,
                        and what the office agreed to pay out. */}
                    <p className="mt-2 text-sm text-ink-soft tnum">
                      {car.publicDailyRate
                        ? `Listed at ${pkr(car.publicDailyRate)} a day`
                        : car.expectedDailyRate
                          ? `You asked for ${pkr(car.expectedDailyRate)} a day`
                          : "No rate agreed yet"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-line bg-paper/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <CalendarRange className="size-4 text-brass" aria-hidden />
                      Free dates
                    </h3>
                    {!isEditing ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(car._id);
                            setDraft(car.availability.length ? car.availability : [{ from: "", to: "" }]);
                          }}
                          className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-forest transition-colors hover:bg-forest hover:text-paper"
                        >
                          Change dates
                        </button>
                        {car.status !== "paused" ? (
                          <button
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
                        <button
                          type="button"
                          onClick={() => void saveDates(car._id)}
                          disabled={busy === car._id}
                          className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
                        >
                          {busy === car._id ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <Save className="size-4" aria-hidden />
                          )}
                          Save dates
                        </button>
                        <button
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
