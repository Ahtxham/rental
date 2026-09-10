import type { Metadata } from "next";

import { ListingReview } from "@/components/admin/listing-review";
import { adminList } from "@/lib/admin-api";
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
  approved: 1,
  paused: 2,
  rejected: 3,
};

const ListingsPage = async () => {
  const listings = await adminList<AdminListing>("/api/rentals/listings");
  const sorted = [...listings].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const waiting = listings.filter((listing) => listing.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Partner cars</h1>
        <p className="mt-1 text-sm text-muted">
          {waiting > 0
            ? `${waiting} waiting on a decision.`
            : "Nothing waiting. Approved cars appear on the website for the dates their owner offered."}
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
            <ListingReview key={listing._id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ListingsPage;
