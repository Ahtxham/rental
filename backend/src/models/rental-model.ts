import mongoose, { Schema, Types } from "mongoose";

/**
 * One car, one customer, a date range.
 *
 * A deliberately narrower thing than the rental module this project carried
 * until August: that one also sold SEATS on intercity journeys, which is a
 * different business with a different unit (a passenger, not a car) and was
 * removed with the rest of it. What is here is the whole-car rental
 * this business runs, with a driver or without one.
 *
 * The status ladder is the operational one, not a workflow for its own sake:
 *
 *   enquiry   somebody asked. No car is held. Costs nothing, blocks nothing.
 *   confirmed dates and a car are held. THIS is what makes a car unavailable.
 *   out       the keys are gone. Odometer and fuel recorded at the kerb.
 *   returned  the car is back, the charges are final, the money is settled.
 *   cancelled either side walked away.
 *
 * `enquiry` deliberately does not block a car. Half of them never become
 * bookings, and an office that cannot rent a car because of three unanswered
 * WhatsApp messages will stop entering enquiries at all.
 */
export const RENTAL_STATUSES = ["enquiry", "confirmed", "out", "returned", "cancelled"] as const;
export type RentalStatus = (typeof RENTAL_STATUSES)[number];

/** The statuses that hold a car against a date range. */
export const BLOCKING_STATUSES: RentalStatus[] = ["confirmed", "out"];

export interface RentalCustomer {
  fullName: string;
  phone: string;
  whatsapp?: string;
  /** Digits only. The single most important field on a rental in this market. */
  cnic?: string;
  address?: string;
  altPhone?: string;
}

/**
 * What was true about the car at the kerb, in both directions.
 *
 * The photos are the reason this exists. Every dispute about a rental car is
 * about a scratch, a fuel gauge or a reading, and all three are settled by a
 * picture taken while both people were standing there.
 */
export interface RentalCheck {
  at: Date;
  odometer: number;
  /** The gauge in eighths, as it reads: 8 is full, 4 is half. Null if not noted. */
  fuelEighths?: number | null;
  photos: string[];
  by?: Types.ObjectId;
  note?: string;
}

export interface RentalAttrs {
  owner: Types.ObjectId;
  /** Absent on an enquiry nobody has assigned a car to yet. */
  car?: Types.ObjectId;
  /**
   * A car belonging to somebody outside the business, when that is what was
   * booked. Mutually exclusive with `car` in practice, one booking is one
   * vehicle, but kept as separate fields rather than a polymorphic ref,
   * because everything that reads `car` assumes Musafir has the keys and
   * would be wrong about a borrowed one.
   */
  listedCar?: Types.ObjectId;
  withDriver: boolean;
  /** The Musafir driver sent out with the car, when there is one. */
  driver?: Types.ObjectId;
  customer: RentalCustomer;

  startAt: Date;
  endAt: Date;
  /** Derived. See the hook, a rental day is 24 hours, rounded UP. */
  days: number;

  dailyRate: number;
  /**
   * The kilometres the daily rate covers, per day, and what each one beyond
   * costs. Both optional: an unlimited-mileage booking simply leaves them
   * unset, and then no overage is ever charged.
   */
  kmIncludedPerDay?: number;
  extraKmRate?: number;

  driverAllowance: number;
  deliveryCharge: number;
  discount: number;
  otherCharges: number;
  otherChargesNote?: string;

  /** Derived at return, from the two odometer readings. */
  distanceKm?: number;
  extraKm: number;
  extraKmAmount: number;

  /** Derived: days × dailyRate. */
  rentAmount: number;
  /** Derived: rent + allowance + delivery + overage + other − discount. */
  totalAmount: number;
  advancePaid: number;
  /** Derived: total − advance. Negative means the customer is owed change. */
  balanceDue: number;

  /**
   * Held, not earned. Kept out of `totalAmount` for exactly that reason, a
   * deposit that lands in the day's takings is a deposit somebody spends.
   */
  securityDeposit: number;
  depositRefunded: number;

  /**
   * The owner's side of a booking on somebody else's car.
   *
   * Only meaningful when `listedCar` is set. The customer pays Musafir the
   * whole `totalAmount`; this is what comes back out of it and goes to the
   * person whose car it was.
   *
   * `commissionPercent` is COPIED from the business's settings when the
   * booking is confirmed, never read live: an owner who was promised 80% of a
   * booking in March must still get 80% of it when it is paid out in April,
   * whatever the default has become since.
   *
   * The base is the rent plus any overage, both are the car earning and
   * wearing, and deliberately NOT the driver's allowance or a delivery
   * charge, which are Musafir's costs and Musafir's to keep.
   */
  commissionPercent?: number;
  commissionAmount: number;
  ownerPayout: number;
  ownerPaidAt?: Date;
  /** Whatever the bank transfer was called, so it can be found again. */
  ownerPaymentRef?: string;

  handover?: RentalCheck;
  returned?: RentalCheck;

  /** The signed agreement, photographed. See the note in CLAUDE.md. */
  agreementPhotos: string[];
  agreementSignedAt?: Date;

  status: RentalStatus;
  cancelReason?: string;
  notes?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type RentalDocument = mongoose.HydratedDocument<RentalAttrs>;

/** CNICs are stored digits-only so two spellings of one card still match. */
export const normalizeCnic = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const digits = value.replace(/\D/g, "");
  return digits || undefined;
};

const checkSchema = new Schema<RentalCheck>(
  {
    at: { type: Date, required: true },
    odometer: { type: Number, required: true, min: 0 },
    fuelEighths: { type: Number, min: 0, max: 8, default: null },
    photos: { type: [String], default: [] },
    by: { type: Schema.Types.ObjectId, ref: "Admin" },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const rentalSchema = new Schema<RentalAttrs>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    car: { type: Schema.Types.ObjectId, ref: "Car" },
    listedCar: { type: Schema.Types.ObjectId, ref: "ListedCar" },
    withDriver: { type: Boolean, default: true },
    driver: { type: Schema.Types.ObjectId, ref: "Driver" },
    customer: {
      type: new Schema<RentalCustomer>(
        {
          fullName: { type: String, required: true, trim: true },
          phone: { type: String, required: true, trim: true },
          whatsapp: { type: String, trim: true },
          cnic: { type: String, trim: true, set: normalizeCnic },
          address: { type: String, trim: true },
          altPhone: { type: String, trim: true },
        },
        { _id: false },
      ),
      required: true,
    },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    days: { type: Number, default: 1, min: 1 },

    dailyRate: { type: Number, default: 0, min: 0 },
    kmIncludedPerDay: { type: Number, min: 0 },
    extraKmRate: { type: Number, min: 0 },

    driverAllowance: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    otherChargesNote: { type: String, trim: true, maxlength: 300 },

    distanceKm: { type: Number, min: 0 },
    extraKm: { type: Number, default: 0, min: 0 },
    extraKmAmount: { type: Number, default: 0, min: 0 },

    rentAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0 },

    securityDeposit: { type: Number, default: 0, min: 0 },
    depositRefunded: { type: Number, default: 0, min: 0 },

    commissionPercent: { type: Number, min: 0, max: 100 },
    commissionAmount: { type: Number, default: 0, min: 0 },
    ownerPayout: { type: Number, default: 0, min: 0 },
    ownerPaidAt: { type: Date },
    ownerPaymentRef: { type: String, trim: true, maxlength: 120 },

    handover: { type: checkSchema, default: undefined },
    returned: { type: checkSchema, default: undefined },

    agreementPhotos: { type: [String], default: [] },
    agreementSignedAt: { type: Date },

    status: { type: String, enum: RENTAL_STATUSES, default: "enquiry" },
    cancelReason: { type: String, trim: true, maxlength: 300 },
    notes: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
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

/** Availability for a borrowed car, asked the same way as for one of ours. */
rentalSchema.index({ owner: 1, listedCar: 1, startAt: 1, endAt: 1 });
/** The board: every booking, by status, newest first. */
rentalSchema.index({ owner: 1, status: 1, startAt: -1 });
/** Availability: is this car held over these dates? Asked per car, constantly. */
rentalSchema.index({ owner: 1, car: 1, startAt: 1, endAt: 1 });
/** One customer's history, found by the number they called from. */
rentalSchema.index({ owner: 1, "customer.phone": 1 });
/** The payout queue: returned bookings on borrowed cars nobody has paid yet. */
rentalSchema.index({ owner: 1, listedCar: 1, status: 1, ownerPaidAt: 1 });

/**
 * The slack before a late return costs a whole day.
 *
 * Without it the rule is indefensible in the one argument it will always be
 * in: a car handed over at 10:00 and brought back at 10:04 is charged for
 * another twenty-four hours, and the customer is right to be angry. An hour is
 * what counters in this market actually give, long enough to cover traffic on
 * the way back, short enough that nobody plans around it.
 */
export const RENTAL_GRACE_MINUTES = 60;
const RENTAL_GRACE_MS = RENTAL_GRACE_MINUTES * 60_000;

/**
 * How many days a booking is charged for.
 *
 * Exported because the website quotes a price before any Rental exists, and a
 * quote that counts days differently from the booking it turns into is the
 * argument this whole grace period was added to avoid.
 */
export const rentalDays = (startAt: Date, endAt: Date): number =>
  Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime() - RENTAL_GRACE_MS) / 86_400_000));

/**
 * Everything derived, in one place, on every save.
 *
 * **A rental day is 24 hours and it rounds UP**, which is how every rental
 * counter in the country charges and how every customer expects to be charged:
 * out at 10am Monday and back at 2pm Tuesday is two days, not one and a bit.
 * `Math.round`, which the old module used, quietly gave that afternoon away.
 *
 * Mongoose 9 dropped the `next` callback from document middleware; a hook that
 * does no async work just returns.
 */
rentalSchema.pre("validate", function () {
  if (this.startAt && this.endAt) {
    this.days = rentalDays(this.startAt, this.endAt);
  }

  // The distance is only real once both readings exist. A rental still out has
  // no distance, not zero, which would price an overage of nothing.
  if (this.handover && this.returned) {
    this.distanceKm = Math.max(0, this.returned.odometer - this.handover.odometer);
  }

  // Overage is charged only when a limit was agreed AND a price for breaking
  // it was agreed. One without the other is not a rule, it is a surprise.
  if (this.distanceKm !== undefined && this.kmIncludedPerDay && this.extraKmRate) {
    this.extraKm = Math.max(0, this.distanceKm - this.kmIncludedPerDay * this.days);
    this.extraKmAmount = Math.round(this.extraKm * this.extraKmRate);
  } else {
    this.extraKm = 0;
    this.extraKmAmount = 0;
  }

  this.rentAmount = this.days * (this.dailyRate || 0);
  this.totalAmount = Math.max(
    0,
    this.rentAmount +
      (this.driverAllowance || 0) +
      (this.deliveryCharge || 0) +
      this.extraKmAmount +
      (this.otherCharges || 0) -
      (this.discount || 0),
  );
  // The deposit is not in the total on purpose, see the field.
  this.balanceDue = this.totalAmount - (this.advancePaid || 0);

  /**
   * The owner's share, on a booking of somebody else's car.
   *
   * Recomputed on every save rather than frozen at confirmation, because the
   * figures it is built from move: a late return adds days, and an overage is
   * only known once the car is back. What IS frozen is the percentage, see
   * the field. A booking of one of Musafir's own cars has no owner to pay, and
   * both figures stay at zero rather than quietly describing a payout nobody
   * is owed.
   */
  if (this.listedCar && this.commissionPercent !== undefined) {
    const base = this.rentAmount + this.extraKmAmount;
    this.commissionAmount = Math.round((base * this.commissionPercent) / 100);
    this.ownerPayout = Math.max(0, base - this.commissionAmount);
  } else {
    this.commissionAmount = 0;
    this.ownerPayout = 0;
  }
});

export const Rental = mongoose.model<RentalAttrs>("Rental", rentalSchema);
