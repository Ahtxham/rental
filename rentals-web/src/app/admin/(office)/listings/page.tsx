import type { Metadata } from "next";

import { ListingReview } from "@/components/admin/listing-review";
import { adminFetch, adminList } from "@/lib/admin-api";
import type { AdminListing } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Partner cars" };

/**
 * Cars offered by people outside the business, waiting on a decision.
 *
 * Pending first, and not merely sorted, an owner who signed up on Tuesday and
 * has heard nothing by Friday does not sign up again, and this queue is the
 * only place anybody would notice.
 */
const ORDER: Record<AdminListing["status"], number> = {
  pending: 0,
  offered: 1,
  approved: 2,
  paused: 3,
  rejected: 4,
};

const ListingsPage = async () => {
  const [listings, { body }] = await Promise.all([
    adminList<AdminListing>("/api/rentals/listings"),
    adminFetch("/api/auth/me"),
  ]);
  const houseCommission =
    (body as { agency?: { settings?: { commissionPercent?: number } } }).agency?.settings
      ?.commissionPercent ?? 0;
  const sorted = [...listings].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const waiting = listings.filter((listing) => listing.status === "pending").length;
  // Counted separately because it is not the office's work. A car sitting with
  // its owner needs chasing, not deciding, and the two piles are cleared in
  // completely different ways.
  const withOwners = listings.filter((listing) => listing.status === "offered").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Partner cars</h1>
        <p className="mt-1 text-sm text-muted">
          {[
            waiting > 0 ? `${waiting} waiting on a decision` : null,
            withOwners > 0 ? `${withOwners} waiting on the owner to answer an offer` : null,
          ]
            .filter(Boolean)
            .join(", ") ||
            "Nothing waiting. A car goes on the website once its owner has agreed to the terms."}
        </p>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-8 text-sm text-muted">
          Nobody has offered a car yet. The pitch is on{" "}
          <span className="font-semibold text-ink">/rent-your-car</span>.
        </p>
      ) : (
        <div className="space-y-5">
          {sorted.map((listing) => (
            <ListingReview
              key={listing._id}
              listing={listing}
              houseCommission={houseCommission}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ListingsPage;
