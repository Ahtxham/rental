import type { Metadata } from "next";
import Link from "next/link";

import { PayoutRow } from "@/components/admin/payout-row";
import { adminFetch } from "@/lib/admin-api";
import type { AdminPayout } from "@/lib/admin-types";
import { pkr } from "@/lib/format";

export const metadata: Metadata = { title: "Payouts" };

/**
 * What Musafir owes the people who lent their cars.
 *
 * The half of the lender business that decides whether anybody lends a second
 * time. Only returned bookings appear: paying out on one still running would
 * be paying for kilometres that have not happened, and a late return moves the
 * figure.
 */
const PayoutsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ settled?: string }>;
}) => {
  const settled = (await searchParams).settled === "true";
  const { body } = await adminFetch(`/api/rentals/payouts?settled=${settled}`);
  const { data = [], totalPayable = 0 } = body as {
    data?: AdminPayout[];
    totalPayable?: number;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Payouts</h1>
          <p className="mt-1 text-sm text-muted">
            {settled
              ? "Already sent. The receipt book."
              : "Owed on completed bookings of other people's cars."}
          </p>
        </div>
        {!settled && totalPayable > 0 ? (
          <p className="text-end">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Total to send
            </span>
            <span className="font-display text-3xl font-semibold text-forest tnum">
              {pkr(totalPayable)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="inline-flex rounded-full bg-ink/[0.05] p-1">
        {[
          { label: "To pay", href: "/admin/payouts", active: !settled },
          { label: "Paid", href: "/admin/payouts?settled=true", active: settled },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              tab.active
                ? "rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-paper"
                : "rounded-full px-4 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {data.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">
            {settled ? "Nothing paid out yet." : "Nothing owed. Every completed booking is settled."}
          </p>
        ) : (
          data.map((payout) => <PayoutRow key={payout._id} payout={payout} />)
        )}
      </div>
    </div>
  );
};

export default PayoutsPage;
