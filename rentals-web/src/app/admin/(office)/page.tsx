import { CircleAlert, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui";
import { adminList } from "@/lib/admin-api";
import {
  carLabel,
  STATUS_LABEL,
  STATUS_TONE,
  type AdminRental,
  type RentalStatus,
} from "@/lib/admin-types";
import { pkr, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Bookings" };

/**
 * The board the office lives on.
 *
 * Grouped by status rather than sorted by date, because the question somebody
 * opens this screen with is never "what happened in order", it is "what needs
 * me now". Enquiries are first and loudest: an unanswered one is a customer
 * ringing somebody else.
 */
const GROUPS: Array<{ status: RentalStatus; title: string; blurb: string }> = [
  {
    status: "enquiry",
    title: "Asked for a car",
    blurb: "Nobody has answered these yet. They hold nothing.",
  },
  {
    status: "confirmed",
    title: "Confirmed, not yet gone",
    blurb: "A car is held for each of these.",
  },
  { status: "out", title: "Out on the road", blurb: "Keys are gone. Take the return when it lands." },
];

const Row = ({ rental }: { rental: AdminRental }) => (
  <Link
    href={`/admin/bookings/${rental._id}`}
    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 transition-colors duration-150 last:border-b-0 hover:bg-paper-deep"
  >
    <div className="min-w-44 flex-1">
      <p className="text-sm font-semibold text-ink">{rental.customer.fullName}</p>
      <p className="text-xs text-muted tnum">{rental.customer.phone}</p>
    </div>
    <div className="min-w-40 text-sm text-ink-soft">
      {carLabel(rental.car ?? rental.listedCar)}
      {rental.listedCar ? (
        <span className="ms-2 text-[11px] font-semibold text-muted">partner</span>
      ) : null}
    </div>
    <div className="min-w-44 text-sm text-ink-soft tnum">
      {shortDate(rental.startAt)} → {shortDate(rental.endAt)}
      <span className="ms-2 text-xs text-muted">
        {rental.days} {rental.days === 1 ? "day" : "days"}
      </span>
    </div>
    <div className="min-w-24 text-end text-sm font-semibold tnum">
      {rental.totalAmount ? pkr(rental.totalAmount) : <span className="text-muted">not priced</span>}
    </div>
    <Badge tone={STATUS_TONE[rental.status]}>{STATUS_LABEL[rental.status]}</Badge>
  </Link>
);

const AdminBookingsPage = async () => {
  // One call, grouped here. Three calls would be three round trips for a board
  // that is a few dozen rows on a busy week.
  const rentals = await adminList<AdminRental>("/api/rentals?limit=200");

  const byStatus = (status: RentalStatus) => rentals.filter((rental) => rental.status === status);
  const recent = rentals
    .filter((rental) => rental.status === "returned" || rental.status === "cancelled")
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Bookings</h1>
        <p className="mt-1 text-sm text-muted">
          Everything the office has to act on, with the unanswered ones first.
        </p>
      </div>

      {GROUPS.map((group) => {
        const rows = byStatus(group.status);
        return (
          <section key={group.status}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                {group.title}
                <span className="ms-2 text-sm font-medium text-muted tnum">{rows.length}</span>
              </h2>
              <p className="text-xs text-muted">{group.blurb}</p>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-card">
              {rows.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
                  <Inbox className="size-4" aria-hidden />
                  Nothing here.
                </p>
              ) : (
                rows.map((rental) => <Row key={rental._id} rental={rental} />)
              )}
            </div>
          </section>
        );
      })}

      {recent.length > 0 ? (
        <section>
          <h2 className="font-display text-xl font-semibold">Recently closed</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-card">
            {recent.map((rental) => (
              <Row key={rental._id} rental={rental} />
            ))}
          </div>
        </section>
      ) : null}

      {rentals.length === 0 ? (
        <p className="flex items-start gap-2 rounded-2xl border border-dashed border-line p-6 text-sm text-muted">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Nothing here yet, or the server did not answer. Requests from
          musafircars.com land here as enquiries the moment somebody sends one.
        </p>
      ) : null}
    </div>
  );
};

export default AdminBookingsPage;
