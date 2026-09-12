/**
 * The shape of an offer, and the one piece of arithmetic in it.
 *
 * Shared between the office's review screen and the car owner's portal because
 * both show the same number to two different people, and those two people
 * argue about money when the numbers do not match. The same function exists on
 * the server in `listed-car-model.ts`, which is the copy that decides what is
 * actually paid; this one exists so the screens cannot say something different
 * from what the server will do.
 */
export type OfferResponse = "accepted" | "declined";

export interface ListingOffer {
  /** What a customer is charged per day if the owner agrees. */
  dailyRate: number;
  /** Musafir's share of that. The owner keeps the rest. */
  commissionPercent: number;
  kmIncludedPerDay?: number;
  extraKmRate?: number;
  /** The office's message to the owner, shown to them verbatim. */
  note?: string;
  offeredAt: string;
  respondedAt?: string;
  response?: OfferResponse;
  responseNote?: string;
}

export type ListingStatus = "pending" | "offered" | "approved" | "rejected" | "paused";

/** What the owner keeps per day. Rounded the same way the server rounds it. */
export const ownerDailyShare = (dailyRate: number, commissionPercent: number): number =>
  Math.max(0, Math.round(dailyRate - (dailyRate * commissionPercent) / 100));
