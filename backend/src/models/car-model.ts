import mongoose, { Schema, Types } from "mongoose";

export type FuelType = "petrol" | "diesel" | "cng" | "hybrid" | "electric";
export type CarStatus = "active" | "maintenance" | "inactive";

/**
 * A car Musafir owns and rents out.
 *
 * Everything a fleet's `Car` used to carry, expected mileage, tank capacity,
 * the tracker it is wired to, the shifts it runs, its complaint QR code, went
 * with the fleet operations this product no longer does. What is left is what a
 * rental business asks about a car: what it is, what it costs a day, how many
 * kilometres that buys, and whether it is on the website.
 *
 * `currentOdometer` stays, and it is not vestigial: a handover and a return
 * both write it, and the difference between them is what an overage is charged
 * on.
 *
 * Cars belonging to somebody outside the business are NOT this model, see
 * `listed-car-model.ts`. Keeping them apart is deliberate: everything that
 * reads a `Car` assumes Musafir has the keys.
 */

// Note: plain attrs interface + HydratedDocument (not `extends Document`),
// the `model` field would otherwise clash with Document's `model()` method.
export interface CarAttrs {
  owner: Types.ObjectId;
  registrationNumber: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  photos: string[];
  fuelType: FuelType;
  transmission?: "manual" | "automatic";
  seats: number;
  /** Air conditioning, a boot that takes suitcases, what a customer asks. */
  features: string[];
  currentOdometer: number;
  status: CarStatus;

  /**
   * On musafircars.com, or not.
   *
   * A car is published because somebody deliberately published it, and it
   * cannot be published without a price, the site would otherwise quote a
   * blank. See the validator below.
   */
  listed: boolean;
  /** Chauffeur-driven, per day. Every car has one; this is the default mode. */
  withDriverRate?: number;
  /**
   * Self-drive, per day, and unset on a car not offered that way.
   *
   * Gated twice on purpose: this rate AND `Agency.settings.selfDriveEnabled`
   * must both be set for the site to print it, so the whole business can be
   * switched back to chauffeur-only in one place.
   */
  selfDriveRate?: number;
  kmIncludedPerDay?: number;
  extraKmRate?: number;
  /** One or two lines in Musafir's own words, printed on the car's card. */
  description?: string;

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CarDocument = mongoose.HydratedDocument<CarAttrs>;

/** Bounded, because these render as chips on a public page. */
export const MAX_FEATURES = 10;

const carSchema = new Schema<CarAttrs>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    registrationNumber: { type: String, required: true, trim: true, uppercase: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, min: 1980, max: 2100 },
    color: { type: String, trim: true },
    photos: { type: [String], default: [] },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "cng", "hybrid", "electric"],
      default: "petrol",
    },
    transmission: { type: String, enum: ["manual", "automatic"] },
    seats: { type: Number, default: 4, min: 1, max: 60 },
    features: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= MAX_FEATURES,
        message: `A car can list at most ${MAX_FEATURES} features.`,
      },
    },
    currentOdometer: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive"],
      default: "active",
    },

    listed: { type: Boolean, default: false },
    withDriverRate: { type: Number, min: 0 },
    selfDriveRate: { type: Number, min: 0 },
    kmIncludedPerDay: { type: Number, min: 0 },
    extraKmRate: { type: Number, min: 0 },
    description: { type: String, trim: true, maxlength: 300 },

    isDeleted: { type: Boolean, default: false },
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

/**
 * A published car has a price. Refused rather than quietly hidden, because a
 * car that vanishes from the site after being switched on looks like a bug to
 * whoever switched it on, and they will switch it on again.
 */
carSchema.pre("validate", function () {
  if (this.listed && !this.withDriverRate && !this.selfDriveRate) {
    this.invalidate(
      "listed",
      "Set a daily rate before putting this car on the website, the page has nothing to quote otherwise.",
    );
  }
});

// One registration number per business, ignoring soft-deleted cars.
carSchema.index(
  { owner: 1, registrationNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

/** The website's own query: what is published, cheapest first. */
carSchema.index({ owner: 1, listed: 1, status: 1 });

export const Car = mongoose.model<CarAttrs>("Car", carSchema);
