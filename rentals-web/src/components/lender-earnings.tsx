import { Badge } from "@/components/ui";
import { pkr, shortDate } from "@/lib/format";

export interface LenderEarning {
  id: string;
  car: string;
  status: "confirmed" | "out" | "returned";
  startAt: string;
  endAt: string;
  days: number;
  amount: number;
  paidAt: string | null;
  reference: string | null;
}

export interface LenderTotals {
  earned: number;
  paid: number;
  due: number;
}

/**
 * What an owner's cars have made them.
 *
 * The half of lending a car that decides whether anybody does it twice. It
 * deliberately shows nothing about the customer, an owner is entitled to know
 * their car was out for three days and what that paid, not who was driving it,
 * and the person who rented it never agreed to that.
 *
 * A booking that has not come back shows no figure at all rather than a
 * provisional one: a late return adds days and the kilometres are not known
 * until the odometer is read, so any number printed early is a number somebody
 * will later be told was wrong.
 */
export const LenderEarnings = ({
  earnings,
  totals,
}: {
  earnings: LenderEarning[];
  totals: LenderTotals;
}) => {
  if (earnings.length === 0) {
    return (
      <section className="mt-12 rounded-2xl border border-dashed border-line p-8">
        <h2 className="font-display text-xl font-semibold">Earnings</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          Nothing yet. Once one of your cars goes out, the booking appears here
          with what it earned you, and again when we have sent the money.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">Earnings</h2>
        <div className="flex gap-6 text-end">
          <p>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Waiting to be sent
            </span>
            <span className="font-display text-2xl font-semibold text-ink tnum">
              {pkr(totals.due)}
            </span>
          </p>
          <p>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Paid to you
            </span>
            <span className="font-display text-2xl font-semibold tnum">{pkr(totals.paid)}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-card">
        {earnings.map((earning) => (
          <div
            key={earning.id}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-5 py-4 last:border-b-0"
          >
            <div className="min-w-40 flex-1">
              <p className="text-sm font-semibold text-ink">{earning.car}</p>
              <p className="text-xs text-muted tnum">
                {shortDate(earning.startAt)} → {shortDate(earning.endAt)} · {earning.days}{" "}
                {earning.days === 1 ? "day" : "days"}
              </p>
            </div>

            {earning.status === "returned" ? (
              <p className="min-w-28 text-end font-display text-lg font-semibold text-ink tnum">
                {pkr(earning.amount)}
              </p>
            ) : (
              <p className="min-w-28 text-end text-sm text-muted">
                {earning.status === "out" ? "Out now" : "Booked"}
              </p>
            )}

            {earning.paidAt ? (
              <Badge tone="good">
                Paid {shortDate(earning.paidAt)}
                {earning.reference ? ` · ${earning.reference}` : ""}
              </Badge>
            ) : earning.status === "returned" ? (
              <Badge tone="neutral">Being sent</Badge>
            ) : (
              <Badge>Not final yet</Badge>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted">
        A booking is only final once the car is back, a late return adds days,
        and kilometres over the allowance are not known until we read the
        odometer. We send the money after that, and the transfer reference shows
        here.
      </p>
    </section>
  );
};
