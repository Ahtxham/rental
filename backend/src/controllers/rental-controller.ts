import { Request, Response } from "express";
import { Types } from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { Car } from "@/models/car-model";
import { Driver } from "@/models/driver-model";
import { ListedCar } from "@/models/listed-car-model";
import { BLOCKING_STATUSES, Rental, RENTAL_STATUSES, RentalStatus } from "@/models/rental-model";
import { recordAudit } from "@/services/audit-service";
import { notifyLender } from "@/services/notification-service";
import { emitToLender, emitToOwner } from "@/services/socket-service";
import { catchAsync } from "@/utils/catch-async";

const CAR_FIELDS = "registrationNumber make model year color seats photos currentOdometer";
const DRIVER_FIELDS = "fullName phone photo";
/**
 * A borrowed car, for the office's own screens.
 *
 * The registration IS included here and never on the public API, the office
 * takes custody of the thing and has to know which car turned up.
 */
const LISTED_FIELDS = "registrationNumber make model year color seats photos lender";

/** Fields an admin may set directly. Everything else is derived or earned. */
const EDITABLE = [
  "car",
  "listedCar",
  "driver",
  "withDriver",
  "customer",
  "startAt",
  "endAt",
  "dailyRate",
  "kmIncludedPerDay",
  "extraKmRate",
  "driverAllowance",
  "deliveryCharge",
  "discount",
  "otherCharges",
  "otherChargesNote",
  "advancePaid",
  "securityDeposit",
  "agreementPhotos",
  "agreementSignedAt",
  "notes",
] as const;

/**
 * The owner's cut, on a booking of somebody else's car.
 *
 * Settable, because a particular car may have been agreed on different terms
 * from the house default, but only ever written by the office, the lender's
 * own routes cannot reach this controller.
 */
const PAYOUT_EDITABLE = ["commissionPercent", "ownerPaymentRef"] as const;

const pickAllowed = (body: Record<string, unknown>, fields: readonly string[]) => {
  const picked: Record<string, unknown> = {};
  for (const key of fields) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * The gauge, or nothing.
 *
 * `Number(null)` is 0, and 0 on a fuel gauge means EMPTY, so passing an
 * unnoted reading straight through the constructor turned "nobody looked" into
 * "it came back dry", which is a charge. Null and zero are different answers
 * here, as they are everywhere else in this product.
 */
const parseFuel = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const eighths = Number(value);
  if (!Number.isFinite(eighths)) return null;
  return Math.min(8, Math.max(0, Math.round(eighths)));
};

/**
 * Which rentals hold this car, or any car, across a window.
 *
 * Two instants overlap when each starts before the other ends. Only
 * `confirmed` and `out` count: an enquiry holds nothing (see the model).
 */
const overlappingRentals = async (
  ownerId: string,
  from: Date,
  to: Date,
  options: {
    car?: Types.ObjectId | string;
    listedCar?: Types.ObjectId | string;
    exclude?: string;
  } = {},
) => {
  const filter: Record<string, unknown> = {
    owner: ownerId,
    status: { $in: BLOCKING_STATUSES },
    startAt: { $lt: to },
    endAt: { $gt: from },
  };
  if (options.car) filter.car = options.car;
  // A borrowed car is held by its own field. Asking the wrong one is how a
  // second customer gets promised a Corolla that is already spoken for.
  if (options.listedCar) filter.listedCar = options.listedCar;
  if (options.exclude) filter._id = { $ne: options.exclude };

  return Rental.find(filter)
    .select("car listedCar status startAt endAt customer.fullName")
    .lean();
};

/**
 * Re-read one booking with its car, its owner and its driver attached.
 *
 * Every write below responds with the booking it just changed, and a saved
 * document carries bare ObjectIds where the caller expects the populated
 * shape it was given a moment ago, so the screen that just confirmed a
 * booking would blank out the car it had been looking at. One extra read per
 * write is the right price for that.
 */
const populated = (id: Types.ObjectId | string, ownerId: string | undefined) =>
  Rental.findOne({ _id: id, owner: ownerId })
    .populate("car", CAR_FIELDS)
    .populate({
      path: "listedCar",
      select: LISTED_FIELDS,
      populate: { path: "lender", select: "fullName phone email" },
    })
    .populate("driver", DRIVER_FIELDS);

/**
 * GET /api/rentals/availability?from=&to=
 *
 * Every car Musafir could give somebody over those dates, and for the ones
 * it cannot, the reason. Returning the unavailable cars WITH their reason is
 * the point, "no cars" is not an answer anybody can act on, while "the Alto
 * is back on the 14th" is.
 */
export const checkAvailability = catchAsync(async (req: Request, res: Response) => {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const exclude = typeof req.query.exclude === "string" ? req.query.exclude : undefined;

  if (!from || !to || to <= from) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Give a start and an end, with the end after the start." });
    return;
  }

  const [cars, held] = await Promise.all([
    Car.find({ owner: req.ownerId, isDeleted: false, status: { $ne: "inactive" } })
      .select(`${CAR_FIELDS} status`)
      .sort({ registrationNumber: 1 })
      .lean(),
    overlappingRentals(String(req.ownerId), from, to, { exclude }),
  ]);

  const heldByCar = new Map<string, typeof held>();
  for (const rental of held) {
    if (!rental.car) continue;
    const key = String(rental.car);
    heldByCar.set(key, [...(heldByCar.get(key) ?? []), rental]);
  }

  const data = cars.map((car) => {
    const key = String(car._id);
    const bookings = heldByCar.get(key) ?? [];
    return {
      car,
      // Maintenance is not a booking, but it is still a car nobody can drive.
      free: bookings.length === 0 && car.status !== "maintenance",
      unavailableReason:
        bookings.length > 0
          ? "booked"
          : car.status === "maintenance"
            ? "maintenance"
            : null,
      bookings: bookings.map((b) => ({
        _id: String(b._id),
        status: b.status,
        startAt: b.startAt,
        endAt: b.endAt,
        customer: b.customer?.fullName ?? null,
      })),
    };
  });

  res.json({ data, range: { from, to } });
});

/** GET /api/rentals, the board, with the counts its tabs are made of. */
export const listRentals = catchAsync(async (req: Request, res: Response) => {
  const { status, car, driver, from, to, q } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = { owner: req.ownerId };
  if (status && RENTAL_STATUSES.includes(status as RentalStatus)) filter.status = status;
  if (car && Types.ObjectId.isValid(car)) filter.car = new Types.ObjectId(car);
  if (driver && Types.ObjectId.isValid(driver)) filter.driver = new Types.ObjectId(driver);

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  // Overlap, not containment: a rental that started last week and runs through
  // this one belongs in this week's list.
  if (fromDate) filter.endAt = { $gte: fromDate };
  if (toDate) filter.startAt = { $lte: toDate };

  if (q && q.trim()) {
    const term = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { "customer.fullName": { $regex: term, $options: "i" } },
      { "customer.phone": { $regex: term, $options: "i" } },
      { "customer.cnic": { $regex: term.replace(/\D/g, "") || term } },
    ];
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const [rentals, total, counts] = await Promise.all([
    Rental.find(filter)
      .sort({ startAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate("car", CAR_FIELDS)
      .populate("listedCar", LISTED_FIELDS)
      .populate("driver", DRIVER_FIELDS)
      .lean(),
    Rental.countDocuments(filter),
    Rental.aggregate<{ _id: RentalStatus; count: number }>([
      { $match: { owner: new Types.ObjectId(String(req.ownerId)) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    data: rentals,
    total,
    offset,
    limit,
    counts: Object.fromEntries(counts.map((row) => [row._id, row.count])),
  });
});

export const getRental = catchAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findOne({ _id: req.params.id, owner: req.ownerId })
    .populate("car", CAR_FIELDS)
    .populate({
      path: "listedCar",
      select: LISTED_FIELDS,
      populate: { path: "lender", select: "fullName phone email" },
    })
    .populate("driver", DRIVER_FIELDS);

  if (!rental) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Booking not found." });
    return;
  }
  res.json({ data: rental });
});

/**
 * Everything both create and update have to agree on.
 *
 * Returns a message when the request cannot stand, so the two callers cannot
 * drift into enforcing different rules on the same booking.
 */
const validate = async (
  ownerId: string,
  body: Record<string, unknown>,
  current?: { startAt: Date; endAt: Date; car?: Types.ObjectId; status: RentalStatus; _id: Types.ObjectId },
): Promise<string | null> => {
  const startAt = parseDate(body.startAt) ?? current?.startAt ?? null;
  const endAt = parseDate(body.endAt) ?? current?.endAt ?? null;
  if (!startAt || !endAt) return "A booking needs a start and an end.";
  if (endAt <= startAt) return "The return has to be after the handover.";

  const carId = (body.car as string | undefined) ?? (current?.car ? String(current.car) : undefined);
  if (carId && !Types.ObjectId.isValid(carId)) return "That car is not valid.";

  const status = (body.status as RentalStatus | undefined) ?? current?.status ?? "enquiry";

  if (carId) {
    const car = await Car.findOne({ _id: carId, owner: ownerId, isDeleted: false }).select("_id");
    if (!car) return "That car is not one of ours.";
  }

  const driverId = body.driver as string | undefined;
  if (driverId) {
    const driver = await Driver.findOne({
      _id: driverId,
      owner: ownerId,
      isDeleted: false,
    }).select("_id");
    if (!driver) return "That driver is not on the roster.";
  }

  // Only a booking that HOLDS a car can clash with another that holds it. An
  // enquiry is free to sit on top of anything.
  if (carId && BLOCKING_STATUSES.includes(status)) {
    const clashes = await overlappingRentals(ownerId, startAt, endAt, {
      car: carId,
      exclude: current ? String(current._id) : undefined,
    });
    if (clashes.length > 0) {
      return "That car is already booked over those dates.";
    }
  }

  return null;
};

export const createRental = catchAsync(async (req: Request, res: Response) => {
  const body = pickAllowed(req.body as Record<string, unknown>, [...EDITABLE, "status"]);

  const status = body.status as RentalStatus | undefined;
  if (status && !RENTAL_STATUSES.includes(status)) {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({ message: "Unknown status." });
    return;
  }
  // A booking is entered either as a question or as a held car. It cannot be
  // entered as one already out on the road, that is what handover is for.
  if (status && !["enquiry", "confirmed"].includes(status)) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "A new booking starts as an enquiry or confirmed." });
    return;
  }

  const problem = await validate(String(req.ownerId), body);
  if (problem) {
    res.status(statusCodes.CONFLICT).json({ message: problem });
    return;
  }
  if (status === "confirmed" && !body.car) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Confirming a booking means naming the car it is for." });
    return;
  }

  const rental = await Rental.create({
    ...body,
    owner: req.ownerId,
    createdBy: req.user?._id,
  });

  await recordAudit(req, {
    action: "rental.created",
    target: { type: "rental", id: String(rental._id), label: rental.customer.fullName },
  });
  emitToOwner(String(req.ownerId), "rental:updated", { rentalId: String(rental._id) });

  res.status(statusCodes.CREATED).json({ data: rental, message: "Booking saved." });
});

export const updateRental = catchAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findOne({ _id: req.params.id, owner: req.ownerId });
  if (!rental) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Booking not found." });
    return;
  }
  if (rental.status === "returned" || rental.status === "cancelled") {
    res
      .status(statusCodes.CONFLICT)
      .json({ message: "This booking is closed. Reopen it before editing." });
    return;
  }

  const body = pickAllowed(req.body as Record<string, unknown>, EDITABLE);
  const problem = await validate(String(req.ownerId), body, rental);
  if (problem) {
    res.status(statusCodes.CONFLICT).json({ message: problem });
    return;
  }

  Object.assign(rental, body, { updatedBy: req.user?._id });
  await rental.save();

  emitToOwner(String(req.ownerId), "rental:updated", { rentalId: String(rental._id) });
  res.json({ data: await populated(rental._id, req.ownerId), message: "Booking updated." });
});

/**
 * POST /api/rentals/:id/confirm, hold the car.
 *
 * Separate from a plain edit because this is the moment the car stops being
 * available to anyone else, and it is the moment the overlap check has to be
 * re-run against whatever happened while the enquiry sat there.
 */
export const confirmRental = catchAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findOne({ _id: req.params.id, owner: req.ownerId });
  if (!rental) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Booking not found." });
    return;
  }
  if (rental.status !== "enquiry") {
    res.status(statusCodes.CONFLICT).json({ message: "Only an enquiry can be confirmed." });
    return;
  }

  const body = pickAllowed(req.body as Record<string, unknown>, [...EDITABLE, ...PAYOUT_EDITABLE]);
  Object.assign(rental, body);

  // One vehicle, and it is either ours or somebody's. Both would make every
  // downstream question ("whose car is out?") ambiguous.
  if (rental.car && rental.listedCar) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "A booking is for one car, ours or a partner's, not both." });
    return;
  }
  if (!rental.car && !rental.listedCar) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Confirming a booking means naming the car it is for." });
    return;
  }

  const clashes = await overlappingRentals(String(req.ownerId), rental.startAt, rental.endAt, {
    ...(rental.car ? { car: rental.car } : { listedCar: rental.listedCar }),
    exclude: String(rental._id),
  });
  if (clashes.length > 0) {
    res.status(statusCodes.CONFLICT).json({ message: "That car is already booked over those dates." });
    return;
  }

  /**
   * Freeze the commission at the moment of confirmation.
   *
   * Copied from settings rather than read live at payout time, so an owner
   * promised 80% of a booking in March still gets 80% of it when it is paid in
   * April, whatever the house default has become since. Only set if it is not
   * already: re-confirming must never silently move somebody's money.
   */
  if (rental.listedCar && rental.commissionPercent === undefined) {
    rental.commissionPercent = req.agency?.settings.commissionPercent ?? 0;
  }

  rental.status = "confirmed";
  rental.updatedBy = req.user?._id;
  await rental.save();

  await recordAudit(req, {
    action: "rental.confirmed",
    target: { type: "rental", id: String(rental._id), label: rental.customer.fullName },
  });
  emitToOwner(String(req.ownerId), "rental:updated", { rentalId: String(rental._id) });

  res.json({ data: await populated(rental._id, req.ownerId), message: "Booking confirmed." });
});

/** POST /api/rentals/:id/handover, the keys are gone. */
export const handoverRental = catchAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findOne({ _id: req.params.id, owner: req.ownerId });
  if (!rental) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Booking not found." });
    return;
  }
  if (rental.status !== "confirmed") {
    res
      .status(statusCodes.CONFLICT)
      .json({ message: "Confirm the booking before handing the car over." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const odometer = Number(body.odometer);
  if (!Number.isFinite(odometer) || odometer < 0) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Record the odometer as it reads right now." });
    return;
  }

  rental.handover = {
    at: parseDate(body.at) ?? new Date(),
    odometer,
    fuelEighths: parseFuel(body.fuelEighths),
    photos: Array.isArray(body.photos) ? (body.photos as string[]).slice(0, 10) : [],
    by: req.user?._id,
    note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : undefined,
  };
  rental.status = "out";
  rental.updatedBy = req.user?._id;
  await rental.save();

  // The car's own reading moves with it. A rental puts hundreds of kilometres
  // on a car, and leaving `currentOdometer` behind makes the next booking's
  // distance, and so its overage, nonsense. Guarded on `car`, because a
  // borrowed one is not ours to keep a reading on.
  if (rental.car) {
    await Car.updateOne(
      { _id: rental.car, owner: req.ownerId, currentOdometer: { $lt: odometer } },
      { $set: { currentOdometer: odometer } },
    );
  }

  await recordAudit(req, {
    action: "rental.handover",
    target: { type: "rental", id: String(rental._id), label: rental.customer.fullName },
  });
  emitToOwner(String(req.ownerId), "rental:updated", { rentalId: String(rental._id) });

  res.json({ data: await populated(rental._id, req.ownerId), message: "Handover recorded." });
});

/** POST /api/rentals/:id/return, the car is back and the charges are final. */
export const returnRental = catchAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findOne({ _id: req.params.id, owner: req.ownerId });
  if (!rental) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Booking not found." });
    return;
  }
  if (rental.status !== "out") {
    res.status(statusCodes.CONFLICT).json({ message: "This car is not out on rent." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const odometer = Number(body.odometer);
  if (!Number.isFinite(odometer) || odometer < 0) {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({ message: "Record the closing odometer." });
    return;
  }
  if (rental.handover && odometer < rental.handover.odometer) {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({
      message: `The closing reading is below the ${rental.handover.odometer.toLocaleString()} km it went out on.`,
    });
    return;
  }

  const at = parseDate(body.at) ?? new Date();
  rental.returned = {
    at,
    odometer,
    fuelEighths: parseFuel(body.fuelEighths),
    photos: Array.isArray(body.photos) ? (body.photos as string[]).slice(0, 10) : [],
    by: req.user?._id,
    note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : undefined,
  };

  // A late return is charged for. `endAt` moves to when the car actually came
  // back, which is what re-derives `days`, and with it the rent and the
  // included kilometres, from what happened rather than what was planned.
  if (at > rental.endAt) rental.endAt = at;

  if (body.otherCharges !== undefined) rental.otherCharges = Number(body.otherCharges) || 0;
  if (typeof body.otherChargesNote === "string") {
    rental.otherChargesNote = body.otherChargesNote.trim().slice(0, 300);
  }
  if (body.advancePaid !== undefined) rental.advancePaid = Number(body.advancePaid) || 0;
  if (body.depositRefunded !== undefined) {
    rental.depositRefunded = Number(body.depositRefunded) || 0;
  }

  rental.status = "returned";
  rental.updatedBy = req.user?._id;
  await rental.save();

  if (rental.car) {
    await Car.updateOne(
      { _id: rental.car, owner: req.ownerId, currentOdometer: { $lt: odometer } },
      { $set: { currentOdometer: odometer } },
    );
  }

  await recordAudit(req, {
    action: "rental.returned",
    target: { type: "rental", id: String(rental._id), label: rental.customer.fullName },
  });
  emitToOwner(String(req.ownerId), "rental:updated", { rentalId: String(rental._id) });

  res.json({ data: await populated(rental._id, req.ownerId), message: "Return recorded." });
});

/** POST /api/rentals/:id/cancel, and the way back from it. */
export const cancelRental = catchAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findOne({ _id: req.params.id, owner: req.ownerId });
  if (!rental) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Booking not found." });
    return;
  }
  if (rental.status === "out") {
    res
      .status(statusCodes.CONFLICT)
      .json({ message: "The car is out on the road. Record the return instead." });
    return;
  }

  const body = req.body as { reason?: unknown; reopen?: unknown };

  if (body.reopen === true) {
    if (rental.status !== "cancelled") {
      res.status(statusCodes.CONFLICT).json({ message: "This booking is not cancelled." });
      return;
    }
    // Back to an enquiry, never straight to confirmed: whatever the car was
    // doing while this sat cancelled, it was not being held for this customer.
    rental.status = "enquiry";
    rental.cancelReason = undefined;
  } else {
    rental.status = "cancelled";
    rental.cancelReason =
      typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : undefined;
  }

  rental.updatedBy = req.user?._id;
  await rental.save();

  await recordAudit(req, {
    action: body.reopen === true ? "rental.reopened" : "rental.cancelled",
    target: { type: "rental", id: String(rental._id), label: rental.customer.fullName },
  });
  emitToOwner(String(req.ownerId), "rental:updated", { rentalId: String(rental._id) });

  res.json({
    data: await populated(rental._id, req.ownerId),
    message: body.reopen === true ? "Booking reopened." : "Booking cancelled.",
  });
});

/**
 * GET /api/rentals/payouts, what Musafir owes the people who lent their cars.
 *
 * The other half of the lender business, and the half that decides whether
 * anybody lends a second time. Returned bookings on borrowed cars, oldest
 * first, with what came off the top and what is left to send.
 *
 * `?settled=true` shows the ones already paid, the same list, read as a
 * receipt book rather than a to-do list.
 */
export const listPayouts = catchAsync(async (req: Request, res: Response) => {
  const settled = req.query.settled === "true";

  const rentals = await Rental.find({
    owner: req.ownerId,
    listedCar: { $exists: true },
    status: "returned",
    ownerPaidAt: settled ? { $ne: null } : null,
  })
    .select(
      "listedCar startAt endAt days rentAmount extraKmAmount commissionPercent commissionAmount ownerPayout ownerPaidAt ownerPaymentRef customer.fullName",
    )
    .populate({
      path: "listedCar",
      select: "make model registrationNumber lender",
      populate: { path: "lender", select: "fullName phone email" },
    })
    .sort({ endAt: 1 })
    .lean();

  const owed = rentals.reduce((sum, rental) => sum + (rental.ownerPayout || 0), 0);
  res.json({ data: rentals, total: rentals.length, totalPayable: owed });
});

/**
 * POST /api/rentals/:id/payout, the owner has been paid.
 *
 * Only after the car is back. Paying out on a booking still running would be
 * paying for kilometres that have not happened, and the figure moves when the
 * car returns late.
 */
export const settlePayout = catchAsync(async (req: Request, res: Response) => {
  const rental = await Rental.findOne({
    _id: req.params.id,
    owner: req.ownerId,
    listedCar: { $exists: true },
  });
  if (!rental) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Booking not found." });
    return;
  }
  if (rental.status !== "returned") {
    res
      .status(statusCodes.CONFLICT)
      .json({ message: "Record the return first, the amount is not final until the car is back." });
    return;
  }
  if (rental.ownerPaidAt) {
    res.status(statusCodes.CONFLICT).json({ message: "This one is already marked paid." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  rental.ownerPaidAt = parseDate(body.paidAt) ?? new Date();
  if (typeof body.reference === "string") {
    rental.ownerPaymentRef = body.reference.trim().slice(0, 120);
  }
  rental.updatedBy = req.user?._id;
  await rental.save();

  const listing = await ListedCar.findById(rental.listedCar).select("lender make model").lean();
  if (listing?.lender) {
    // Their own car, their own money, and nothing about the customer.
    await notifyLender(listing.lender, {
      title: "Payment sent",
      body: `Your ${listing.make} ${listing.model} has been paid out for a completed booking.`,
      data: { type: "payout:settled", rentalId: String(rental._id) },
    }).catch(() => undefined);
    emitToLender(String(listing.lender), "payout:settled", { rentalId: String(rental._id) });
  }

  await recordAudit(req, {
    action: "rental.payout-settled",
    target: { type: "rental", id: String(rental._id), amount: rental.ownerPayout },
  });

  res.json({ data: await populated(rental._id, req.ownerId), message: "Marked as paid." });
});
