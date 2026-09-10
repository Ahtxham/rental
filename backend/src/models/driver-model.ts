import mongoose, { Schema, Types } from "mongoose";

/**
 * Somebody Musafir sends out with a car.
 *
 * A roster, not an employment system. The fleet product this grew out of gave
 * a driver a login, a shift history, a wallet, a commission rate and a phone
 * app; a chauffeur-driven rental needs none of that. What the office actually
 * has to know is who went out with which car, how to reach them, and whether
 * their licence is still valid, because a customer sitting in the back has
 * every right to ask.
 *
 * Deliberately has **no password and no account**: a driver never signs in
 * here. Fewer credentials is fewer credentials to lose.
 */
export type DriverStatus = "active" | "inactive";

export interface DriverAttrs {
  owner: Types.ObjectId;
  fullName: string;
  phone: string;
  whatsapp?: string;
  photo?: string;
  /** Digits only, so two spellings of one card still match. */
  cnic?: string;
  licenceNumber?: string;
  /**
   * When the licence runs out.
   *
   * Stored because it expires, and an expired licence is the one thing on this
   * record that turns a normal day into an uninsured one. Nothing enforces it
   * yet; the admin list sorts by it so it cannot go unseen.
   */
  licenceExpiry?: Date;
  address?: string;
  /** What the office wants to remember. Never leaves the admin API. */
  note?: string;
  status: DriverStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DriverDocument = mongoose.HydratedDocument<DriverAttrs>;

const driverSchema = new Schema<DriverAttrs>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    photo: { type: String },
    cnic: {
      type: String,
      trim: true,
      set: (value: unknown) =>
        typeof value === "string" ? value.replace(/\D/g, "") || undefined : undefined,
    },
    licenceNumber: { type: String, trim: true, uppercase: true },
    licenceExpiry: { type: Date },
    address: { type: String, trim: true },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
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

/** The roster: who is available to send out. */
driverSchema.index({ owner: 1, isDeleted: 1, status: 1, fullName: 1 });

export const Driver = mongoose.model<DriverAttrs>("Driver", driverSchema);
