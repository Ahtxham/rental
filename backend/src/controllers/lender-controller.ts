import { Request, Response } from "express";
import { Types } from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { PUBLIC_AGENCY_ID } from "@/constants/env";
import { Agency } from "@/models/agency-model";
import { Lender, LenderDocument } from "@/models/lender-model";
import {
  ListedCar,
  LISTING_STATUSES,
  ownerDailyShare,
} from "@/models/listed-car-model";
import { Rental } from "@/models/rental-model";
import { recordAudit } from "@/services/audit-service";
import { notifyAgencyAdmins, notifyLender } from "@/services/notification-service";
import { catchAsync } from "@/utils/catch-async";
import { signToken } from "@/utils/jwt-helper";
import { comparePassword, hashPassword } from "@/utils/password-helper";

/**
 * "Rent your car when it is free", the owner's side of it.
 *
 * Every route here belongs to one person and reads only their own rows. A
 * lender is the first account in this product held by somebody outside the
 * business, so the rule is absolute: nothing on this router may return a row
 * it has not filtered by `lender: req.user._id`. Tenant scoping is not enough
 * on its own, every lender shares a tenant with every other lender.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const lenderAgencyId = (): Types.ObjectId | null =>
  PUBLIC_AGENCY_ID && Types.ObjectId.isValid(PUBLIC_AGENCY_ID)
    ? new Types.ObjectId(PUBLIC_AGENCY_ID)
    : null;

const me = (req: Request): LenderDocument => req.user as LenderDocument;

/**
 * Rupees, for a sentence rather than a table.
 *
 * The website has its own formatter; this one exists because a notification is
 * written on the server and has to read as a sentence in an OS notification
 * tray, where "9500" and "Rs 9,500" are not the same message.
 */
const rupees = (amount: number): string => `Rs ${Math.round(amount).toLocaleString("en-US")}`;

const issue = async (lender: LenderDocument) => ({
  token: signToken({
    id: lender._id.toString(),
    accountType: "lender",
    tv: lender.tokenVersion ?? 0,
  }),
  accountType: "lender" as const,
  user: lender.toJSON(),
});

/**
 * POST /api/lenders/auth/signup, public.
 *
 * Creates a **pending** account and signs them straight in. Making somebody
 * wait for approval before they can even see their own dashboard would mean
 * they leave and never come back; what approval actually gates is a car going
 * on the website, which is where it belongs.
 */
export const signup = catchAsync(async (req: Request, res: Response) => {
  const owner = lenderAgencyId();
  if (!owner) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Not available." });
    return;
  }
  const agency = await Agency.findById(owner).select("status").lean();
  if (!agency || agency.status !== "active") {
    res.status(statusCodes.NOT_FOUND).json({ message: "Not available." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (fullName.length < 2 || !EMAIL.test(email) || phone.length < 7) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "We need your name, a working email and a phone number." });
    return;
  }
  if (password.length < 8) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Choose a password of at least 8 characters." });
    return;
  }

  // Answered the same way whether or not the address is taken: a signup form
  // that says "this email already exists" is a way to find out who has an
  // account here.
  const existing = await Lender.findOne({ email }).select("_id");
  if (existing) {
    res.status(statusCodes.CONFLICT).json({
      message: "We could not create that account. If it is already yours, sign in instead.",
    });
    return;
  }

  const lender = await Lender.create({
    owner,
    fullName,
    email,
    phone,
    whatsapp: typeof body.whatsapp === "string" ? body.whatsapp.trim() : undefined,
    city: typeof body.city === "string" ? body.city.trim() : undefined,
    password: await hashPassword(password),
    status: "pending",
  });

  await notifyAgencyAdmins(owner, {
    title: "New car owner signed up",
    body: "Somebody has registered to list a car. Open the portal to review them.",
    data: { type: "lender:signup", lenderId: String(lender._id) },
  }).catch(() => undefined);

  res.status(statusCodes.CREATED).json(await issue(lender));
});

/** POST /api/lenders/auth/login, public. */
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(statusCodes.BAD_REQUEST).json({ message: "Email and password are required." });
    return;
  }

  const lender = await Lender.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!lender || !lender.password || !(await comparePassword(password, lender.password))) {
    res.status(statusCodes.UNAUTHORIZED).json({ message: "Wrong email or password." });
    return;
  }
  if (lender.status === "suspended") {
    res
      .status(statusCodes.FORBIDDEN)
      .json({ message: "This account is on hold. Please call the office." });
    return;
  }

  await Lender.updateOne({ _id: lender._id }, { $set: { lastLoginAt: new Date() } });
  res.json(await issue(lender));
});

/** GET /api/lenders/me, who is signed in, and where their listings stand. */
export const profile = catchAsync(async (req: Request, res: Response) => {
  const lender = me(req);
  const counts = await ListedCar.aggregate<{ _id: string; count: number }>([
    { $match: { lender: lender._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  res.json({
    data: {
      user: lender.toJSON(),
      counts: Object.fromEntries(counts.map((row) => [row._id, row.count])),
    },
  });
});

/** PATCH /api/lenders/me, their own details, and nothing else. */
export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const lender = me(req);
  const body = req.body as Record<string, unknown>;

  // An allowlist, not a spread: `status`, `owner` and `tokenVersion` are the
  // fields a lender would most like to set, and none of them are theirs.
  for (const key of ["fullName", "phone", "whatsapp", "cnic", "city", "address"] as const) {
    if (typeof body[key] === "string") {
      (lender as unknown as Record<string, unknown>)[key] = (body[key] as string).trim();
    }
  }
  await lender.save();
  res.json({ data: lender.toJSON(), message: "Saved." });
});

const windowsFrom = (value: unknown): Array<{ from: Date; to: Date }> => {
  if (!Array.isArray(value)) return [];
  const parsed: Array<{ from: Date; to: Date }> = [];
  for (const entry of value.slice(0, 40)) {
    const from = new Date((entry as { from?: string })?.from ?? "");
    const to = new Date((entry as { to?: string })?.to ?? "");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) continue;
    parsed.push({ from, to });
  }
  return parsed.sort((a, b) => a.from.getTime() - b.from.getTime());
};

const CAR_FIELDS = [
  "make",
  "model",
  "year",
  "color",
  "seats",
  "fuelType",
  "transmission",
  "registrationNumber",
  "photos",
  "description",
  "expectedDailyRate",
  "kmIncludedPerDay",
  "extraKmRate",
  "driverBy",
] as const;

const pickCarFields = (body: Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};
  for (const key of CAR_FIELDS) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  if (Array.isArray(picked.photos)) picked.photos = (picked.photos as string[]).slice(0, 8);
  return picked;
};

/** GET /api/lenders/cars, this lender's garage. */
export const listMyCars = catchAsync(async (req: Request, res: Response) => {
  const cars = await ListedCar.find({ lender: me(req)._id }).sort({ createdAt: -1 }).lean();
  res.json({ data: cars });
});

/** POST /api/lenders/cars, offer a car. Lands as pending, always. */
export const createMyCar = catchAsync(async (req: Request, res: Response) => {
  const lender = me(req);
  const body = req.body as Record<string, unknown>;
  const fields = pickCarFields(body);

  if (!fields.make || !fields.model || !fields.registrationNumber) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "We need the make, the model and the registration number." });
    return;
  }

  const car = await ListedCar.create({
    ...fields,
    owner: lender.owner,
    lender: lender._id,
    availability: windowsFrom(body.availability),
    status: "pending",
  });

  await notifyAgencyAdmins(lender.owner, {
    title: "A car has been offered",
    body: "A car owner has submitted a car for listing. Open the portal to review it.",
    data: { type: "listing:submitted", listingId: String(car._id) },
  }).catch(() => undefined);

  res.status(statusCodes.CREATED).json({ data: car, message: "Sent for review." });
});

/**
 * PATCH /api/lenders/cars/:id, edit their own car.
 *
 * **Editing an approved car sends it back for review.** The alternative is
 * that somebody gets a Corolla approved and then edits it into a different
 * car, at a different price, on the live website.
 *
 * Availability is the exception, and deliberately: dates change constantly,
 * that is the whole point of the product, and re-reviewing a car because its
 * owner needs it next Tuesday would make the feature unusable.
 */
export const updateMyCar = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }

  const car = await ListedCar.findOne({ _id: id, lender: me(req)._id });
  if (!car) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const fields = pickCarFields(body);
  const detailsChanged = Object.keys(fields).length > 0;

  Object.assign(car, fields);
  if (body.availability !== undefined) car.availability = windowsFrom(body.availability);

  /**
   * A changed car invalidates an offer made on the old one.
   *
   * The office priced a 2021 Honda City with two suitcases. If that becomes a
   * 2016 Alto between the offer and the answer, the number attached to it is
   * meaningless, and leaving it there would let somebody accept terms that
   * were never meant for the car now standing in the driveway. Same reasoning
   * as sending an approved car back for review: the office agreed to a
   * specific thing.
   */
  const hadOffer = car.status === "offered";
  if (detailsChanged && (car.status === "approved" || car.status === "offered")) {
    car.status = "pending";
    car.reviewNote = undefined;
    car.offer = undefined;
  }
  await car.save();

  res.json({
    data: car,
    message: !detailsChanged
      ? "Saved."
      : hadOffer
        ? "Saved. Changing the car withdraws the offer on it, so the office will price it again."
        : car.status === "pending"
          ? "Saved. Changes to the car go back to the office for a quick check."
          : "Saved.",
  });
});

/**
 * POST /api/lenders/cars/:id/offer, the owner's answer to the office's terms.
 *
 * Agreeing is what publishes the car. There is no separate approval step after
 * it, because there is nothing left to approve: the office wrote the terms and
 * the owner accepted them, and making somebody wait again after they have said
 * yes is how a two-day negotiation becomes a two-week one.
 *
 * Declining sends the listing back to `pending` rather than killing it. A
 * number being wrong is the most ordinary outcome of an offer and the office
 * should be able to come back with a better one; ending the listing here would
 * mean re-entering the whole car to continue a conversation about its price.
 */
export const respondToOffer = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }

  const lender = me(req);
  const car = await ListedCar.findOne({ _id: id, lender: lender._id });
  if (!car) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }

  // Both halves matter. An offer that has already been answered must not be
  // answered twice, and a listing that has moved on since is not waiting on
  // anybody, so a stale tab must not be able to publish a car.
  if (car.status !== "offered" || !car.offer || car.offer.response) {
    res
      .status(statusCodes.CONFLICT)
      .json({ message: "There is no offer waiting on this car at the moment." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (typeof body.accept !== "boolean") {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Say whether you accept the offer." });
    return;
  }

  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : undefined;

  car.offer.response = body.accept ? "accepted" : "declined";
  car.offer.respondedAt = new Date();
  car.offer.responseNote = note;

  if (body.accept) {
    // The terms become the car's terms. Copied rather than read through the
    // offer from here on, so that a later offer cannot retroactively change
    // what a published car costs or what its owner is paid.
    car.publicDailyRate = car.offer.dailyRate;
    car.commissionPercent = car.offer.commissionPercent;
    if (car.offer.kmIncludedPerDay !== undefined) car.kmIncludedPerDay = car.offer.kmIncludedPerDay;
    if (car.offer.extraKmRate !== undefined) car.extraKmRate = car.offer.extraKmRate;
    car.status = "approved";
    car.reviewNote = undefined;
  } else {
    car.status = "pending";
  }
  await car.save();

  const label = `${car.make} ${car.model}`.trim();
  await notifyAgencyAdmins(lender.owner, {
    title: body.accept ? "An owner accepted your offer" : "An owner declined your offer",
    body: body.accept
      ? `${label} is now live at ${rupees(car.publicDailyRate ?? 0)} a day.`
      : `${label} is back in the review queue. ${note ? `They said: ${note}` : "No reason given."}`,
    data: { type: body.accept ? "listing:accepted" : "listing:declined", listingId: String(car._id) },
  }).catch(() => undefined);

  res.json({
    data: car,
    message: body.accept
      ? "Agreed. Your car is on the website."
      : "Thanks, we have told the office. They may come back with a different offer.",
  });
});

/**
 * DELETE /api/lenders/cars/:id, take it off the site.
 *
 * A withdrawal, not an erasure: the row is paused rather than deleted, because
 * a car that has been rented out is part of a booking history that has to
 * survive its owner changing their mind.
 */
export const withdrawMyCar = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }

  const car = await ListedCar.findOneAndUpdate(
    { _id: id, lender: me(req)._id },
    { $set: { status: "paused" } },
    { returnDocument: "after" },
  );
  if (!car) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Car not found." });
    return;
  }
  res.json({ data: car, message: "Taken off the website." });
});

/* ─── The office's side ─────────────────────────────────────────────────── */

/** GET /api/rentals/listings?status=, the review queue. */
export const listListings = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = { owner: req.ownerId };
  if (status && (LISTING_STATUSES as readonly string[]).includes(status)) filter.status = status;

  const [listings, counts] = await Promise.all([
    ListedCar.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("lender", "fullName email phone whatsapp city status")
      .lean(),
    ListedCar.aggregate<{ _id: string; count: number }>([
      { $match: { owner: new Types.ObjectId(String(req.ownerId)) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    data: listings,
    counts: Object.fromEntries(counts.map((row) => [row._id, row.count])),
  });
});

/**
 * PATCH /api/rentals/listings/:id/offer, put terms to the car's owner.
 *
 * The office names the price a customer will pay and the share Musafir keeps,
 * and then waits. Nothing is published by this route: an owner's car going
 * live on the strength of a number they have not seen is the single most
 * avoidable argument in this business, and the whole point of the step is that
 * the person whose car it is agreed to the terms in writing first.
 *
 * The commission is part of the offer rather than a setting applied later,
 * because it is half of what the owner is actually being asked. "Rs 9,500 a
 * day" and "Rs 9,500 a day, of which you keep Rs 7,600" are different
 * propositions, and only the second one is an offer.
 *
 * Making a new offer replaces the old one whole, response and all. There is
 * only ever one set of terms on the table.
 */
export const offerListing = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Listing not found." });
    return;
  }

  const listing = await ListedCar.findOne({ _id: id, owner: req.ownerId });
  if (!listing) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Listing not found." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const dailyRate = Number(body.dailyRate);
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Name the daily rate a customer will pay." });
    return;
  }

  // Falls back to the house default rather than to zero. A commission of zero
  // is a real decision somebody might make, and it must be typed, not arrived
  // at because a field was left empty.
  const commissionPercent =
    body.commissionPercent === undefined || body.commissionPercent === ""
      ? (req.agency?.settings.commissionPercent ?? 0)
      : Number(body.commissionPercent);
  if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "The commission has to be a percentage between 0 and 100." });
    return;
  }

  const km = body.kmIncludedPerDay === undefined ? undefined : Number(body.kmIncludedPerDay) || undefined;
  const extraKm = body.extraKmRate === undefined ? undefined : Number(body.extraKmRate) || undefined;

  listing.offer = {
    dailyRate: Math.round(dailyRate),
    commissionPercent,
    kmIncludedPerDay: km ?? listing.kmIncludedPerDay,
    extraKmRate: extraKm ?? listing.extraKmRate,
    note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : undefined,
    offeredAt: new Date(),
    offeredBy: req.user?._id as Types.ObjectId,
  };
  listing.status = "offered";
  listing.reviewNote = undefined;
  listing.reviewedAt = new Date();
  listing.reviewedBy = req.user?._id as Types.ObjectId;
  await listing.save();

  const share = ownerDailyShare(listing.offer.dailyRate, commissionPercent);
  const label = `${listing.make} ${listing.model}`.trim();
  await notifyLender(listing.lender, {
    title: "Musafir has offered a rent for your car",
    body: `${label}: ${rupees(listing.offer.dailyRate)} a day, and you keep ${rupees(share)} of it after our ${commissionPercent}% commission. Open your portal to accept or decline.`,
    data: { type: "listing:offered", listingId: String(listing._id) },
  }).catch(() => undefined);

  await recordAudit(req, {
    action: "listing.offered",
    target: { type: "listing", id: String(listing._id), label },
  });

  res.json({ data: listing, message: "Offer sent to the owner." });
});

/**
 * PATCH /api/rentals/listings/:id, approve, reject or pause.
 *
 * Approving REQUIRES a public daily rate. The owner's expectation and the
 * customer's price are different numbers and the office decides the second
 * one; publishing without it would put a car on the website with no price, or
 * with the owner's asking price as the customer's, which is the business's
 * margin given away by omission.
 */
export const reviewListing = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Listing not found." });
    return;
  }

  const listing = await ListedCar.findOne({ _id: id, owner: req.ownerId });
  if (!listing) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Listing not found." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const status = body.status;
  if (typeof status !== "string" || !(LISTING_STATUSES as readonly string[]).includes(status)) {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({ message: "Unknown status." });
    return;
  }

  if (body.publicDailyRate !== undefined) {
    listing.publicDailyRate = Number(body.publicDailyRate) || 0;
  }
  if (body.kmIncludedPerDay !== undefined) {
    listing.kmIncludedPerDay = Number(body.kmIncludedPerDay) || undefined;
  }
  if (body.extraKmRate !== undefined) listing.extraKmRate = Number(body.extraKmRate) || undefined;
  if (body.commissionPercent !== undefined) {
    const percent =
      body.commissionPercent === "" ? undefined : Number(body.commissionPercent);
    if (percent !== undefined && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
      res
        .status(statusCodes.UNPROCESSABLE_ENTITY)
        .json({ message: "The commission has to be a percentage between 0 and 100." });
      return;
    }
    listing.commissionPercent = percent;
  }

  if (status === "approved" && !listing.publicDailyRate) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Set the price a customer pays before putting this car on the site." });
    return;
  }

  listing.status = status as (typeof LISTING_STATUSES)[number];
  listing.reviewNote =
    typeof body.reviewNote === "string" ? body.reviewNote.trim().slice(0, 500) : undefined;
  listing.reviewedAt = new Date();
  listing.reviewedBy = req.user?._id as Types.ObjectId;
  await listing.save();

  res.json({ data: listing, message: `Listing ${status}.` });
});

/** GET /api/rentals/lenders, the people behind the listings. */
export const listLenders = catchAsync(async (req: Request, res: Response) => {
  const lenders = await Lender.find({ owner: req.ownerId }).sort({ createdAt: -1 }).limit(200).lean();
  res.json({ data: lenders.map(({ password, adminNote, ...rest }) => rest) });
});

/** PATCH /api/rentals/lenders/:id, activate or suspend a car owner. */
export const reviewLender = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Not found." });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const status = body.status;
  if (status !== "active" && status !== "suspended" && status !== "pending") {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({ message: "Unknown status." });
    return;
  }

  const update: Record<string, unknown> = { status };
  if (typeof body.adminNote === "string") update.adminNote = body.adminNote.trim().slice(0, 500);

  const lender = await Lender.findOneAndUpdate(
    { _id: id, owner: req.ownerId },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!lender) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Not found." });
    return;
  }

  // Suspending has to end the sessions too, the token outlives the status by
  // seven days otherwise, and "suspended" that keeps working is not suspended.
  if (status === "suspended") {
    await Lender.updateOne({ _id: lender._id }, { $inc: { tokenVersion: 1 } });
  }

  res.json({ data: lender.toJSON(), message: `Car owner ${status}.` });
});

/**
 * GET /api/lenders/earnings, what this owner's cars have made them.
 *
 * The other half of lending a car, and the half that decides whether anybody
 * lends a second time: an owner who cannot see what a booking earned them has
 * to ring the office to find out, and eventually stops asking.
 *
 * **Nothing about the customer leaves here.** Not their name, not their
 * number, not where they went. The owner is entitled to know their car was out
 * for three days and what that paid; they are not entitled to know who was
 * driving it, and the person who rented it never agreed to that.
 *
 * Confirmed onwards only. An enquiry is a question somebody asked, and showing
 * it as income is how an owner budgets around money that never arrives.
 */
export const listMyEarnings = catchAsync(async (req: Request, res: Response) => {
  const lender = req.user as LenderDocument;

  // The owner's own cars first, so the rentals query can be scoped by id
  // rather than trusting a car id from anywhere else.
  const cars = await ListedCar.find({ lender: lender._id }).select("_id make model").lean();
  if (cars.length === 0) {
    res.json({ data: [], totals: { earned: 0, paid: 0, due: 0 } });
    return;
  }
  const labels = new Map(cars.map((car) => [String(car._id), `${car.make} ${car.model}`]));

  const rentals = await Rental.find({
    owner: lender.owner,
    listedCar: { $in: cars.map((car) => car._id) },
    status: { $in: ["confirmed", "out", "returned"] },
  })
    .select("listedCar status startAt endAt days rentAmount extraKmAmount ownerPayout ownerPaidAt ownerPaymentRef")
    .sort({ startAt: -1 })
    .limit(200)
    .lean();

  const data = rentals.map((rental) => ({
    id: String(rental._id),
    car: labels.get(String(rental.listedCar)) ?? "Your car",
    status: rental.status,
    startAt: rental.startAt,
    endAt: rental.endAt,
    days: rental.days,
    /** Zero until the booking is returned, the figure is not final before then. */
    amount: rental.ownerPayout,
    paidAt: rental.ownerPaidAt ?? null,
    reference: rental.ownerPaymentRef ?? null,
  }));

  const paid = data
    .filter((row) => row.paidAt)
    .reduce((sum, row) => sum + row.amount, 0);
  const due = data
    .filter((row) => row.status === "returned" && !row.paidAt)
    .reduce((sum, row) => sum + row.amount, 0);

  res.json({ data, totals: { earned: paid + due, paid, due } });
});
