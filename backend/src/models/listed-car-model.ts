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
export const LISTING_STATUSES = ["pending", "approved", "rejected", "paused"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

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
  kmIncludedPerDay?: number;
  extraKmRate?: number;
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
