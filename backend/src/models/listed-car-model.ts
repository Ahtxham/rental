import mongoose, { Schema, Types } from "mongoose";

/**
 * A car somebody outside the business has offered, and the dates they are
 * offering it on.
 *
 * **Deliberately not a `Car`.** `Car` is an operational record: it carries
 * a published rate, an odometer the office writes at every handover, and a
 * registration Musafir is answerable for, and every one of those assumes
 * Musafir has the keys. A stranger's Corolla has none of that and should not
 * appear on the office's own car list next to cars that do. If Musafir ever
 * buys one properly, that is a conversion somebody performs, not a flag.
 *
 * The registration number IS stored, the office needs it before it takes
 * custody of anything, and is never published. See the public controller.
 */
/**
 * Where a listing has got to.
 *
 * `offered` is the office's half of a negotiation: terms have been put to the
 * owner and nothing happens until they answer. It is a status rather than a
 * flag on the side because the office's queue is read by status, and "waiting
 * on the owner" is a different pile of work from "waiting on us".
 */
export const LISTING_STATUSES = [
  "pending",
  "offered",
  "approved",
  "rejected",
  "paused",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const OFFER_RESPONSES = ["accepted", "declined"] as const;
export type OfferResponse = (typeof OFFER_RESPONSES)[number];

/**
 * Terms the office has put to a car's owner, and what they said.
 *
 * Kept as one object rather than as loose fields so that an offer is a thing
 * that was made at a moment, by a person, and either answered or not. The
 * owner's answer lives here beside the terms they were answering, which is the
 * only arrangement that survives the office making a second, better offer
 * later: the old one is overwritten whole, and there is never a half-replaced
 * set of numbers with last week's response still attached.
 *
 * `commissionPercent` is part of the offer and not an afterthought. Agreeing
 * to a daily rate without being told what share of it you keep is agreeing to
 * nothing, and this is somebody's car.
 */
export interface ListingOffer {
  /** What a customer will be charged per day if the owner agrees. */
  dailyRate: number;
  /** Musafir's share of that, as a percentage. The owner keeps the rest. */
  commissionPercent: number;
  kmIncludedPerDay?: number;
  extraKmRate?: number;
  /** The office's message to the owner. Shown verbatim in their portal. */
  note?: string;
  offeredAt: Date;
  offeredBy?: Types.ObjectId;
  respondedAt?: Date;
  response?: OfferResponse;
  /** The owner's reply, if they left one. Shown to the office. */
  responseNote?: string;
}

/** A window the owner says the car is free. Half-open: [from, to). */
export interface AvailabilityWindow {
  from: Date;
  to: Date;
}

export interface ListedCarAttrs {
  owner: Types.ObjectId;
  lender: Types.ObjectId;
  make: string;
  model: string;
  year?: number;
  color?: string;
  seats: number;
  fuelType: string;
  transmission?: "manual" | "automatic";
  /** Private. The office sees it; musafircars.com never does. */
  registrationNumber: string;
  photos: string[];
  description?: string;
  /**
   * Two rates that must not be confused.
   *
   * `expectedDailyRate` is what the OWNER hopes to be paid. `publicDailyRate`
   * is what the CUSTOMER is charged, set by the office when it approves the
   * listing, the difference is the business. A listing with no public rate is
   * never published, because publishing one would mean quoting a price nobody
   * in the office agreed to.
   */
  expectedDailyRate?: number;
  publicDailyRate?: number;
  /**
   * Musafir's share of this particular car's earnings, if it was agreed
   * separately from the house default.
   *
   * Undefined means "use the business's setting", which is what most cars do.
   * A number here is a promise made to one owner about one car, and it is the
   * number a booking freezes at confirmation. See `rental-model.ts`.
   */
  commissionPercent?: number;
  kmIncludedPerDay?: number;
  extraKmRate?: number;
  /** The terms last put to the owner, and their answer. */
  offer?: ListingOffer;
  /** Who drives it out: one of the fleet's drivers, or the owner themselves. */
  driverBy: "fleet" | "owner";
  availability: AvailabilityWindow[];
  status: ListingStatus;
  /** Why it was rejected or paused. Shown to the lender, they asked. */
  reviewNote?: string;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ListedCarDocument = mongoose.HydratedDocument<ListedCarAttrs>;

const windowSchema = new Schema<AvailabilityWindow>(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
  },
  { _id: false },
);

const offerSchema = new Schema<ListingOffer>(
  {
    dailyRate: { type: Number, required: true, min: 0 },
    commissionPercent: { type: Number, required: true, min: 0, max: 100 },
    kmIncludedPerDay: { type: Number, min: 0 },
    extraKmRate: { type: Number, min: 0 },
    note: { type: String, trim: true, maxlength: 500 },
    offeredAt: { type: Date, required: true },
    offeredBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    respondedAt: { type: Date },
    response: { type: String, enum: OFFER_RESPONSES },
    responseNote: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const listedCarSchema = new Schema<ListedCarAttrs>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    lender: { type: Schema.Types.ObjectId, ref: "Lender", required: true, index: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, min: 1980, max: 2100 },
    color: { type: String, trim: true },
    seats: { type: Number, default: 4, min: 1, max: 60 },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "cng", "hybrid", "electric"],
      default: "petrol",
    },
    transmission: { type: String, enum: ["manual", "automatic"] },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true },
    photos: { type: [String], default: [] },
    description: { type: String, trim: true, maxlength: 400 },
    expectedDailyRate: { type: Number, min: 0 },
    publicDailyRate: { type: Number, min: 0 },
    commissionPercent: { type: Number, min: 0, max: 100 },
    offer: { type: offerSchema },
    kmIncludedPerDay: { type: Number, min: 0 },
    extraKmRate: { type: Number, min: 0 },
    driverBy: { type: String, enum: ["fleet", "owner"], default: "fleet" },
    availability: { type: [windowSchema], default: [] },
    status: { type: String, enum: LISTING_STATUSES, default: "pending" },
    reviewNote: { type: String, trim: true, maxlength: 500 },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

/** The office's queue: what is waiting to be looked at. */
listedCarSchema.index({ owner: 1, status: 1, createdAt: -1 });
/** A lender's own garage. */
listedCarSchema.index({ lender: 1, createdAt: -1 });
/** The public search: approved listings, then filtered by window in memory. */
listedCarSchema.index({ owner: 1, status: 1, "availability.from": 1, "availability.to": 1 });

/**
 * What the owner keeps, per day, on a given rate and commission.
 *
 * One implementation, used by the office when it composes an offer, by the
 * owner's portal when it shows them what they are agreeing to, and by the
 * tests. Two places computing a person's pay is two places for it to drift,
 * and the one that drifts is always the one they read.
 */
export const ownerDailyShare = (dailyRate: number, commissionPercent: number): number =>
  Math.max(0, Math.round(dailyRate - (dailyRate * commissionPercent) / 100));

/**
 * Is the whole requested window inside one of the offered windows?
 *
 * One window, not several stitched together: a car offered Monday–Wednesday
 * and again Friday–Sunday is not available for a booking that runs Monday to
 * Sunday, and quietly bridging the Thursday is how a customer ends up standing
 * on a driveway whose owner is using their own car.
 */
export const coversWindow = (
  windows: AvailabilityWindow[],
  from: Date,
  to: Date,
): boolean => windows.some((w) => w.from <= from && w.to >= to);

export const ListedCar = mongoose.model<ListedCarAttrs>("ListedCar", listedCarSchema);
