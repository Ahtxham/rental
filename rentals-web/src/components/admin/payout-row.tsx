"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui";
import { asObject, type AdminLender, type AdminPayout } from "@/lib/admin-types";
import { pkr, shortDate } from "@/lib/format";

/**
 * One booking on somebody's car, and the money owed for it.
 *
 * The reference field is not decoration: an owner who asks "did you pay me for
 * the 14th?" wants a transfer id, and a payout marked paid with nothing beside
 * it answers a different question from the one being asked.
 */
export const PayoutRow = ({ payout }: { payout: AdminPayout }) => {
  const router = useRouter();
  const car = asObject(payout.listedCar as never) as
    | { make: string; model: string; lender?: AdminLender }
    | null;

  const [reference, setReference] = useState(payout.ownerPaymentRef ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settle = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/rentals/${payout._id}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: reference || undefined }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) setError(body.message ?? "That did not work.");
      else router.refresh();
    } catch {
      setError("Could not reach the API.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line px-5 py-4 last:border-b-0">
      <div className="min-w-48 flex-1">
        <p className="text-sm font-semibold text-ink">
          {car ? `${car.make} ${car.model}` : "Partner car"}
        </p>
        <p className="text-xs text-muted">
          {car?.lender?.fullName ?? "Owner"}
          {car?.lender?.phone ? <span className="ms-2 tnum">{car.lender.phone}</span> : null}
        </p>
      </div>

      <div className="min-w-40 text-sm text-ink-soft tnum">
        {shortDate(payout.startAt)} → {shortDate(payout.endAt)}
        <span className="ms-2 text-xs text-muted">
          {payout.days} {payout.days === 1 ? "day" : "days"}
        </span>
      </div>

      <div className="min-w-32 text-sm tnum">
        <span className="text-muted">Rent </span>
        {pkr(payout.rentAmount + payout.extraKmAmount)}
      </div>

      <div className="min-w-28 text-sm text-muted tnum">
        − {pkr(payout.commissionAmount)}
        <span className="ms-1 text-xs">({payout.commissionPercent ?? 0}%)</span>
      </div>

      <div className="min-w-28 text-end">
        <span className="font-display text-lg font-semibold text-forest tnum">
          {pkr(payout.ownerPayout)}
        </span>
      </div>

      {payout.ownerPaidAt ? (
        <p className="inline-flex min-w-40 items-center gap-1.5 text-xs font-semibold text-forest">
          <Check className="size-3.5" aria-hidden />
          Paid {shortDate(payout.ownerPaidAt)}
          {payout.ownerPaymentRef ? (
            <span className="font-normal text-muted">· {payout.ownerPaymentRef}</span>
          ) : null}
        </p>
      ) : (
        <div className="flex min-w-64 items-center gap-2">
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Transfer reference"
            className="py-2 text-xs"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void settle()}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-paper hover:bg-forest-mid disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            Mark paid
          </button>
        </div>
      )}

      {error ? (
        <p className="w-full text-xs text-alert" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
