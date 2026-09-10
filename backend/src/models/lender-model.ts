import mongoose, { Schema, Types } from "mongoose";

/**
 * Somebody who owns a car and wants it earning while it sits.
 *
 * A fourth kind of account, and the first one that belongs to a person
 * OUTSIDE the business. That is the whole design constraint: a lender is not
 * staff, cannot be trusted with anything the office knows, and must never reach
 * a tenant-scoped route, so they get their own model, their own routes under
 * `/api/lenders/*`, and a `lenderOnly` guard rather than a role flag on an
 * existing account.
 *
 * They still carry `owner`, because a lender signs up TO the business, and
 * everything they list belongs in its world. It is the
 * same tenant id every other model uses, so nothing downstream has to special
 * case where a car came from.
 *
 * `status` starts at "pending" and it is not decoration: a stranger who has
 * filled in a form is not yet somebody whose car goes on the website.
 */
export const LENDER_STATUSES = ["pending", "active", "suspended"] as const;
export type LenderStatus = (typeof LENDER_STATUSES)[number];

export interface LenderAttrs {
  owner: Types.ObjectId;
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  whatsapp?: string;
  /** Digits only. Needed before any money moves, not to sign up. */
  cnic?: string;
  city?: string;
  address?: string;
  status: LenderStatus;
  /** Bumped on every password change, so an old token dies with it. */
  tokenVersion: number;
  lastLoginAt?: Date;
  /** What the office wants to remember about this person. Never shown to them. */
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LenderDocument = mongoose.HydratedDocument<LenderAttrs>;

const lenderSchema = new Schema<LenderAttrs>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    // Never returned by default. Every read that needs it asks with
    // `.select("+password")`, which makes the exceptions easy to find.
    password: { type: String, select: false },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    cnic: {
      type: String,
      trim: true,
      set: (value: unknown) =>
        typeof value === "string" ? value.replace(/\D/g, "") || undefined : undefined,
    },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    status: { type: String, enum: LENDER_STATUSES, default: "pending" },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    adminNote: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        delete ret.password;
        delete ret.adminNote;
        return ret;
      },
    },
  },
);

/**
 * One account per email, platform-wide.
 *
 * One per email, full stop: the login form asks for an email and a password and nothing
 * else, so two accounts sharing an address would make the answer ambiguous at
 * exactly the moment it must not be.
 */
lenderSchema.index({ email: 1 }, { unique: true });
lenderSchema.index({ owner: 1, status: 1, createdAt: -1 });

export const Lender = mongoose.model<LenderAttrs>("Lender", lenderSchema);
