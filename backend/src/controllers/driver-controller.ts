import { Request, Response } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { Driver } from "@/models/driver-model";
import { BLOCKING_STATUSES, Rental } from "@/models/rental-model";
import { catchAsync } from "@/utils/catch-async";

/**
 * The roster of people Musafir sends out with a car.
 *
 * A list the office keeps, not a system anybody logs into. See the model.
 */

const EDITABLE = [
  "fullName",
  "phone",
  "whatsapp",
  "photo",
  "cnic",
  "licenceNumber",
  "licenceExpiry",
  "address",
  "note",
  "status",
] as const;

const pickAllowed = (body: Record<string, unknown>, fields: readonly string[]) => {
  const picked: Record<string, unknown> = {};
  for (const key of fields) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

export const listDrivers = catchAsync(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { owner: req.ownerId, isDeleted: false };
  if (typeof req.query.status === "string") filter.status = req.query.status;

  const drivers = await Driver.find(filter).sort({ status: 1, fullName: 1 }).lean();
  res.json({ data: drivers, total: drivers.length });
});

export const getDriver = catchAsync(async (req: Request, res: Response) => {
  const driver = await Driver.findOne({ _id: req.params.id, owner: req.ownerId, isDeleted: false });
  if (!driver) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Driver not found." });
    return;
  }
  res.json({ data: driver });
});

export const createDriver = catchAsync(async (req: Request, res: Response) => {
  const driver = await Driver.create({
    ...pickAllowed(req.body ?? {}, EDITABLE),
    owner: req.ownerId,
  });
  res.status(statusCodes.CREATED).json({ data: driver, message: "Driver added." });
});

export const updateDriver = catchAsync(async (req: Request, res: Response) => {
  const driver = await Driver.findOneAndUpdate(
    { _id: req.params.id, owner: req.ownerId, isDeleted: false },
    { $set: pickAllowed(req.body ?? {}, EDITABLE) },
    { new: true, runValidators: true },
  );
  if (!driver) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Driver not found." });
    return;
  }
  res.json({ data: driver, message: "Driver updated." });
});

/**
 * DELETE /api/drivers/:id, soft, and refused while they are out with a car.
 *
 * Soft because a returned booking names the driver who took the car out, and
 * that name is part of the record of what happened.
 */
export const deleteDriver = catchAsync(async (req: Request, res: Response) => {
  const driver = await Driver.findOne({ _id: req.params.id, owner: req.ownerId, isDeleted: false });
  if (!driver) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Driver not found." });
    return;
  }

  const live = await Rental.findOne({
    owner: req.ownerId,
    driver: driver._id,
    status: { $in: BLOCKING_STATUSES },
  })
    .select("_id")
    .lean();
  if (live) {
    res.status(statusCodes.CONFLICT).json({
      message: "This driver is on a live booking. Close or reassign it first.",
    });
    return;
  }

  driver.isDeleted = true;
  await driver.save();
  res.json({ message: "Driver removed." });
});
