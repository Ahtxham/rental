import mongoose, { Schema, Types } from "mongoose";

import { DEFAULT_COMMISSION_PERCENT, DEFAULT_CURRENCY } from "@/constants/env";

export type AgencyStatus = "active" | "suspended";

/**
 * The business itself. Musafir Rent A Car.
 *
 * There is one of these rows in practice, and it is still a row rather than a
 * block of env vars for two reasons: the office edits its own phone number and
 * its own commission without a deploy, and every other model already carries an
 * `owner` pointing here, which is what keeps a query that forgets its scope
 * from quietly reading somebody else's data. (Mongoose drops undefined filter
 * keys, an unscoped `find` returns everything.)
 *
 * It replaces the `Fleet` tenant this codebase started as. The name mattered:
 * a fleet's settings were about drivers' commission, fuel prices and which
 * ride-hailing apps they earn on, none of which a rental business has.
 */
export interface AgencySettings {
  currency: string;
  /**
   * What Musafir keeps from a booking on somebody else's car, as a percentage
   * of the rent.
   *
   * The whole lender business in one number: the customer pays the published
   * rate, this comes off it, and the rest goes to the owner. It is a default,
   * a listing can be agreed at a different split, and the figure is copied onto
   * the booking when it is confirmed rather than read live, so changing it here
   * never moves what somebody has already been promised.
   */
  commissionPercent: number;
  /** Prefills a new booking. The office can always override it. */
  defaultSecurityDeposit: number;
  /** Prefills a new car and a new listing. Both are per-car in the end. */
  defaultKmIncludedPerDay: number;
  defaultExtraKmRate: number;
  /**
   * Whether self-drive is offered at all, business-wide.
   *
   * A kill switch above the per-car rate: turning it off hides every
   * self-drive price on the website in one move, without anybody having to
   * edit twenty cars. Self-drive is where cars get stolen in this market, so
   * the ability to stop it in one place is worth a field.
   */
  selfDriveEnabled: boolean;
}

export interface AgencyAttrs {
  name: string;
  legalName: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  logo?: string;
  status: AgencyStatus;
  settings: AgencySettings;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgencyDocument extends mongoose.Document<Types.ObjectId>, AgencyAttrs {}

/**
 * A plain (lean) agency, what `req.agency` carries. Requests only ever *read*
 * these settings, so the hot path serves a cached POJO instead of hydrating a
 * Mongoose document per call. Anything that writes re-loads the real document
 * and then calls `invalidateAgency`.
 */
export type AgencySnapshot = AgencyAttrs & { _id: Types.ObjectId };

const agencySchema = new Schema<AgencyDocument>(
  {
    name: { type: String, required: true, trim: true },
    legalName: { type: String, default: "", trim: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    logo: { type: String },
    // Suspending locks out every account that belongs to it, checked on login
    // and on every authenticated request.
    status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
    settings: {
      type: new Schema<AgencySettings>(
        {
          currency: { type: String, default: DEFAULT_CURRENCY },
          commissionPercent: {
            type: Number,
            default: DEFAULT_COMMISSION_PERCENT,
            min: 0,
            max: 100,
          },
          defaultSecurityDeposit: { type: Number, default: 0, min: 0 },
          defaultKmIncludedPerDay: { type: Number, default: 0, min: 0 },
          defaultExtraKmRate: { type: Number, default: 0, min: 0 },
          // Off until somebody turns it on, deliberately. See the field.
          selfDriveEnabled: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: () => ({
        currency: DEFAULT_CURRENCY,
        commissionPercent: DEFAULT_COMMISSION_PERCENT,
        defaultSecurityDeposit: 0,
        defaultKmIncludedPerDay: 0,
        defaultExtraKmRate: 0,
        selfDriveEnabled: false,
      }),
    },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        delete ret.notes;
        return ret;
      },
    },
  },
);

export const Agency = mongoose.model<AgencyDocument>("Agency", agencySchema);
