"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Field, Input, Textarea } from "@/components/ui";
import { asObject, type AdminListing } from "@/lib/admin-types";
import { photoSrc } from "@/lib/photos";
import { pkr, shortDate } from "@/lib/format";

/**
 * One car somebody outside the business has offered, and the decision on it.
 *
 * Approving is not a rubber stamp: a listing cannot be published without a
 * `publicDailyRate`, and that is the office's number, not the owner's asking
 * price. The gap between the two is the business, and making somebody type it
 * before they can approve is what stops a car going live at cost.
 */
const TONE = {
  pending: "neutral",
  approved: "good",
  rejected: "warn",
  paused: "neutral",
} as const;

export const ListingReview = ({ listing }: { listing: AdminListing }) => {
  const router = useRouter();
  const owner = asObject(listing.lender);

  const [publicRate, setPublicRate] = useState(String(listing.publicDailyRate ?? ""));
  const [kmIncluded, setKmIncluded] = useState(String(listing.kmIncludedPerDay ?? ""));
  const [extraKmRate, setExtraKmRate] = useState(String(listing.extraKmRate ?? ""));
  const [note, setNote] = useState(listing.reviewNote ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (status: AdminListing["status"]) => {
    setBusy(status);
    setError(null);
    try {
      const response = await fetch(`/api/admin/rentals/listings/${listing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          publicDailyRate: publicRate.trim() === "" ? undefined : Number(publicRate),
          kmIncludedPerDay: kmIncluded.trim() === "" ? undefined : Number(kmIncluded),
          extraKmRate: extraKmRate.trim() === "" ? undefined : Number(extraKmRate),
          reviewNote: note || undefined,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) setError(body.message ?? "That did not work.");
      else router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setBusy(null);
  };

  const margin =
    listing.expectedDailyRate && Number(publicRate)
      ? Number(publicRate) - listing.expectedDailyRate
      : null;

  return (
    <article className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-semibold">
              {listing.make} {listing.model}
            </h2>
            <Badge tone={TONE[listing.status]}>{listing.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted tnum">
            {[listing.year, listing.color, listing.registrationNumber].filter(Boolean).join(" · ")}
          </p>
          {owner ? (
            <p className="mt-1 text-sm text-ink-soft">
              {owner.fullName} · <span className="tnum">{owner.phone}</span> · {owner.email}
              {owner.status !== "active" ? (
                <span className="ms-2 text-xs font-semibold text-alert">
                  account {owner.status}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <p className="text-end text-sm">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Owner wants
          </span>
          <span className="font-display text-2xl font-semibold tnum">
            {pkr(listing.expectedDailyRate)}
          </span>
          <span className="block text-xs text-muted">per day</span>
        </p>
      </div>

      {listing.description ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{listing.description}</p>
      ) : null}

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Offered on
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {listing.availability.length === 0 ? (
            <li className="text-sm text-muted">No dates offered yet.</li>
          ) : (
            listing.availability.map((window) => (
              <li key={window.from} className="rounded-full bg-ink/[0.05] px-3 py-1 text-xs tnum">
                {shortDate(window.from)} → {shortDate(window.to)}
              </li>
            ))
          )}
        </ul>
      </div>

      {listing.photos.length > 0 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {listing.photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo}
              src={photoSrc(photo)}
              alt=""
              className="h-24 w-32 shrink-0 rounded-lg border border-line object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
        <Field
          label="What we charge, per day"
          hint={
            margin === null
              ? "Required before this can be published."
              : `${pkr(margin)} a day to us.`
          }
        >
          <Input
            type="number"
            min={0}
            value={publicRate}
            onChange={(event) => setPublicRate(event.target.value)}
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
        <Field label="Each km over">
          <Input
            type="number"
            min={0}
            value={extraKmRate}
            onChange={(event) => setExtraKmRate(event.target.value)}
            className="tnum"
          />
        </Field>
        <Field label="Note to the owner" className="sm:col-span-3">
          <Textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="They see this. Say why, if you are turning it down or pausing it."
          />
        </Field>
      </div>

      {error ? (
        <p className="mt-4 flex gap-2 text-sm text-alert" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy !== null || publicRate.trim() === ""}
          onClick={() => void decide("approved")}
          className="inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-paper hover:bg-action-deep disabled:opacity-40"
        >
          {busy === "approved" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {listing.status === "approved" ? "Save and keep published" : "Approve and publish"}
        </button>
        {listing.status === "approved" ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void decide("paused")}
            className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-40"
          >
            {busy === "paused" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Take it off the site
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void decide("rejected")}
          className="inline-flex items-center gap-2 rounded-full border border-alert/40 px-5 py-2.5 text-sm font-semibold text-alert hover:bg-alert/5 disabled:opacity-40"
        >
          {busy === "rejected" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Turn it down
        </button>
      </div>
    </article>
  );
};
