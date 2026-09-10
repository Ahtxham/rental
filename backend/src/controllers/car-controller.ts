import { Request, Response } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { Car } from "@/models/car-model";
import { BLOCKING_STATUSES, Rental } from "@/models/rental-model";
import { emitToOwner } from "@/services/socket-service";
import { catchAsync } from "@/utils/catch-async";

/**
 * The office's own cars, the ones Musafir owns and holds the keys to.
 *
 * Cars belonging to members of the public are a different collection and a
 * different controller (`lender-controller`), because the two are not
 * interchangeable: this business decides everything about a car in here, and
 * nothing about one out there without asking its owner.
 */

/** What an admin may set. Everything else is derived or written by a booking. */
const EDITABLE = [
  "registrationNumber",
  "make",
  "model",
  "year",
  "color",
  "photos",
  "fuelType",
  "transmission",
  "seats",
  "features",
  "currentOdometer",
  "status",
  "listed",
  "withDriverRate",
  "selfDriveRate",
  "kmIncludedPerDay",
  "extraKmRate",
  "description",
] as const;

const pickAllowed = (body: Record<string, unknown>, fields: readonly string[]) => {
  const picked: Record<string, unknown> = {};
  for (const key of fields) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * GET /api/cars, the whole list, optionally answered against dates.
 *
 * With `from` and `to` each car comes back with `bookedFrom`, which is the
 * question somebody on the phone is actually asking. Without them it is just
 * the list.
 */
export const listCars = catchAsync(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { owner: req.ownerId, isDeleted: false };
  if (typeof req.query.status === "string") filter.status = req.query.status;
  if (req.query.listed === "true") filter.listed = true;
  if (req.query.listed === "false") filter.listed = false;

  const cars = await Car.find(filter).sort({ make: 1, model: 1 }).lean();

  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  if (!from || !to || to <= from) {
    res.json({ data: cars, total: cars.length });
    return;
  }

  // One query for the whole list rather than one per car: the board asks this
  // on every keystroke of a date field.
  const held = await Rental.find({
    owner: req.ownerId,
    status: { $in: BLOCKING_STATUSES },
    car: { $exists: true },
    startAt: { $lt: to },
    endAt: { $gt: from },
  })
    .select("car endAt customer.fullName")
    .lean();

  const heldByCar = new Map(held.map((rental) => [String(rental.car), rental]));

  res.json({
    data: cars.map((car) => {
      const holder = heldByCar.get(String(car._id));
      return {
        ...car,
        available: !holder,
        // The reason, not just the verdict: "back on the 14th" is something a
        // person on the phone can act on, "not available" ends the call.
        heldUntil: holder?.endAt ?? null,
      };
    }),
    total: cars.length,
    range: { from, to },
  });
});

export const getCar = catchAsync(async (req: Request, res: Response) => {
  const car = await Car.findOne({ _id: req.params.id, owner: req.ownerId, isDeleted: false });
  if (!car) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }
  res.json({ data: car });
});

export const createCar = catchAsync(async (req: Request, res: Response) => {
  const payload = pickAllowed(req.body ?? {}, EDITABLE);

  const existing = await Car.findOne({
    owner: req.ownerId,
    registrationNumber: String(payload.registrationNumber ?? "").toUpperCase(),
    isDeleted: false,
  })
    .select("_id")
    .lean();
  if (existing) {
    res.status(statusCodes.CONFLICT).json({ message: "A car with that registration already exists." });
    return;
  }

  const car = await Car.create({ ...payload, owner: req.ownerId });
  emitToOwner(req.ownerId!, "car:updated", { carId: String(car._id) });
  res.status(statusCodes.CREATED).json({ data: car, message: "Car added." });
});

export const updateCar = catchAsync(async (req: Request, res: Response) => {
  const car = await Car.findOne({ _id: req.params.id, owner: req.ownerId, isDeleted: false });
  if (!car) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }

  const payload = pickAllowed(req.body ?? {}, EDITABLE);
  Object.assign(car, payload);
  // `save` rather than `findOneAndUpdate`, so the "a listed car has a price"
  // validator in the model actually runs.
  await car.save();

  emitToOwner(req.ownerId!, "car:updated", { carId: String(car._id) });
  res.json({ data: car, message: "Car updated." });
});

/**
 * DELETE /api/cars/:id, soft, and refused while the car is out or promised.
 *
 * A hard delete would orphan every booking that ever used it, including the
 * ones being argued about. A car that is out on hire cannot be removed at all:
 * whoever is doing it has forgotten the car is not on the premises.
 */
export const deleteCar = catchAsync(async (req: Request, res: Response) => {
  const car = await Car.findOne({ _id: req.params.id, owner: req.ownerId, isDeleted: false });
  if (!car) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }

  const live = await Rental.findOne({
    owner: req.ownerId,
    car: car._id,
    status: { $in: BLOCKING_STATUSES },
  })
    .select("_id status")
    .lean();
  if (live) {
    res.status(statusCodes.CONFLICT).json({
      message:
        live.status === "out"
          ? "This car is out on hire. Take the return first."
          : "This car is promised to a confirmed booking. Cancel or move that booking first.",
    });
    return;
  }

  car.isDeleted = true;
  car.listed = false;
  await car.save();

  emitToOwner(req.ownerId!, "car:updated", { carId: String(car._id) });
  res.json({ message: "Car removed." });
});
