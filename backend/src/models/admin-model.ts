import mongoose, { Schema, Types } from "mongoose";

export type AdminStatus = "active" | "suspended";

/**
 * Somebody who works in the Musafir office.
 *
 * One role, not three. The platform this grew out of hosted many fleets and
 * needed a `superadmin` above them all; Musafir is one business, so the only
 * distinction left that carries weight is `isAgencyOwner`, the founding
 * account, which teammates cannot suspend, rename or delete out from under
 * itself.
 */
export interface AdminDocument extends mongoose.Document<Types.ObjectId> {
  email: string;
  password?: string;
  fullName: string;
  phone: string;
  photo?: string;
  /** The business this account works for. Always set. */
  agency: Types.ObjectId;
  /** The founding account: teammates can't remove or suspend them. */
  isAgencyOwner: boolean;
  status: AdminStatus;
  /**
   * Bumped on every password change. The JWT carries the value it was issued
   * with, so raising it instantly invalidates every token already out there,
   * without it, resetting a stolen laptop's password leaves the thief signed
   * in until the 7-day expiry.
   */
  tokenVersion: number;
  /**
   * Push bookkeeping. Never cleared: "we told them, their browser was closed"
   * and "they never allowed notifications" are different explanations for an
   * alert nobody acted on, and whoever is asking why a booking request sat
   * unanswered for a day deserves to know which it was.
   */
  pushSubscribedAt?: Date;
  pushOptedOutAt?: Date;
  pushLastNotifiedAt?: Date;
  lastLoginAt?: Date;
  otp?: string;
  otpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<AdminDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    photo: { type: String },
    agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    isAgencyOwner: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    tokenVersion: { type: Number, default: 0 },
    pushSubscribedAt: { type: Date },
    pushOptedOutAt: { type: Date },
    pushLastNotifiedAt: { type: Date },
    lastLoginAt: { type: Date },
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpires;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const Admin = mongoose.model<AdminDocument>("Admin", adminSchema);
