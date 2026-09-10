import { Request, Response } from "express";
import { Types } from "mongoose";

import { PUBLIC_AGENCY_ID } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";
import { Agency, AgencySnapshot } from "@/models/agency-model";
import { Car } from "@/models/car-model";
import { coversWindow, ListedCar } from "@/models/listed-car-model";
import { BLOCKING_STATUSES, Rental, rentalDays } from "@/models/rental-model";
import { notifyAgencyAdmins } from "@/services/notification-service";
import { streamUpload, uploadFileName } from "@/controllers/file-controller";
import { emitToOwner } from "@/services/socket-service";
import { catchAsync } from "@/utils/catch-async";

/**
 * musafircars.com, from the server's side.
 *
 * Unauthenticated, because the person using it is a customer who has never
 * heard of us and is comparing three rental companies on their phone. What
 * separates it from every other route in this product is that **the business
 * cannot come from the request** there is no token to read it from, so it
 * comes from `PUBLIC_AGENCY_ID`, set on the server. Unset means off.
 *
 * **No registration numbers leave here.** A plate is what somebody needs to
 * pretend to be the car, and a customer choosing a Corolla does not need to
 * know which Corolla until they are standing next to it. The car's own id is
 * published instead, which is meaningless without an account.
 *
 * **Nothing about a car's owner leaves here either.** To a customer, a car
 * somebody lent us is simply a car.
 */

const publicAgencyId = (): Types.ObjectId | null =>
  PUBLIC_AGENCY_ID && Types.ObjectId.isValid(PUBLIC_AGENCY_ID)
    ? new Types.ObjectId(PUBLIC_AGENCY_ID)
    : null;

const off = (res: Response) => {
  res.status(statusCodes.NOT_FOUND).json({ message: "Not available." });
};

/** The business, or null when the site is switched off or suspended. */
const liveAgency = async (): Promise<AgencySnapshot | null> => {
  const id = publicAgencyId();
  if (!id) return null;
  const agency = await Agency.findById(id).lean<AgencySnapshot>();
  return agency && agency.status === "active" ? agency : null;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export interface PublicCarShape {
  id: string;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  seats: number;
  fuelType: string;
  transmission: string | null;
  features: string[];
  photos: string[];
  withDriverRate: number | null;
  selfDriveRate: number | null;
  kmIncludedPerDay: number | null;
  extraKmRate: number | null;
  description: string | null;
  available: boolean | null;
  source: "fleet" | "partner";
}

/** Everything the site is allowed to say about one of Musafir's own cars. */
const publicCar = (
  car: {
    _id: Types.ObjectId;
    make: string;
    model: string;
    year?: number;
    color?: string;
    seats: number;
    fuelType: string;
    transmission?: string;
    features?: string[];
    photos: string[];
    withDriverRate?: number;
    selfDriveRate?: number;
    kmIncludedPerDay?: number;
    extraKmRate?: number;
    description?: string;
  },
  selfDriveEnabled: boolean,
): Omit<PublicCarShape, "available"> => ({
  id: String(car._id),
  make: car.make,
  model: car.model,
  year: car.year ?? null,
  color: car.color ?? null,
  seats: car.seats,
  fuelType: car.fuelType,
  transmission: car.transmission ?? null,
  features: car.features ?? [],
  photos: publicPhotos(car.photos),
  withDriverRate: car.withDriverRate ?? null,
  // Gated business-wide as well as per car. One switch in settings takes every
  // self-drive price off the website, which is the point of having it.
  selfDriveRate: selfDriveEnabled ? (car.selfDriveRate ?? null) : null,
  kmIncludedPerDay: car.kmIncludedPerDay ?? null,
  extraKmRate: car.extraKmRate ?? null,
  description: car.description ?? null,
  source: "fleet",
});

const CAR_FIELDS =
  "make model year color seats fuelType transmission features photos withDriverRate selfDriveRate kmIncludedPerDay extraKmRate description";

/**
 * A stored photo URL, as the customer's browser should ask for it.
 *
 * Uploads are written either to S3, which hands back an absolute URL anybody
 * can fetch, or to local disk, which hands back `/uploads/<name>`. That second
 * form redirects to `/api/uploads/<name>`, which sits behind `authMiddleware`
 * because the same directory holds identity documents and handover photos. A
 * customer has no account, so every locally-stored car photo would 404 on the
 * website and every card would fall back to a placeholder.
 *
 * So local URLs are rewritten to the public photo route below, which serves
 * ONLY files a published car actually references. Absolute URLs are left
 * exactly as they are.
 */
const publicPhotoUrl = (url: string): string => {
  if (/^https?:\/\//i.test(url)) return url;
  const name = uploadFileName(url);
  return name ? `/api/public/rentals/photos/${name}` : url;
};

const publicPhotos = (photos: string[] | undefined): string[] =>
  (photos ?? []).map(publicPhotoUrl);

const LISTING_FIELDS =
  "make model year color seats fuelType transmission photos description publicDailyRate kmIncludedPerDay extraKmRate availability";

/**
 * GET /api/public/rentals/config, what the site prints in its own chrome.
 *
 * Served rather than duplicated in the website's env so a phone number changes
 * in one place. Nothing here is secret; it is all on the page.
 */
export const publicConfig = catchAsync(async (_req: Request, res: Response) => {
  const agency = await liveAgency();
  if (!agency) return off(res);

  res.json({
    data: {
      name: agency.name,
      phone: agency.phone ?? null,
      whatsapp: agency.whatsapp ?? null,
      email: agency.email ?? null,
      address: agency.address ?? null,
      city: agency.city ?? null,
      selfDriveEnabled: agency.settings.selfDriveEnabled === true,
      currency: agency.settings.currency,
    },
  });
});

/**
 * Which of these cars is held over this window, by id.
 *
 * One query per collection rather than one per car, this is asked on every
 * date change on the site's busiest page.
 */
const heldIds = async (
  owner: Types.ObjectId,
  field: "car" | "listedCar",
  from: Date,
  to: Date,
): Promise<Set<string>> => {
  const held = await Rental.find({
    owner,
    status: { $in: BLOCKING_STATUSES },
    [field]: { $exists: true },
    startAt: { $lt: to },
    endAt: { $gt: from },
  })
    .select(field)
    .lean();
  return new Set(held.map((rental) => String(rental[field])));
};

/**
 * GET /api/public/rentals/photos/:filename, a car photo, to anybody.
 *
 * The uploads directory holds identity documents, licences and handover
 * photos as well as pictures of cars, which is why reading it needs an account.
 * This route is the one hole in that, and it is a narrow one: a file is served
 * only if a PUBLISHED car or an APPROVED listing actually references it. A
 * filename that is real but belongs to somebody's CNIC matches nothing here and
 * gets the same 404 as a filename that was invented.
 *
 * Cached hard and publicly. These names carry a timestamp and sixteen random
 * hex characters, so a given name is always the same bytes; there is nothing
 * to revalidate.
 */
export const publicPhoto = catchAsync(async (req: Request, res: Response) => {
  const agency = await liveAgency();
  if (!agency) return off(res);

  const name = typeof req.params.filename === "string" ? req.params.filename : "";
  // Validated before it is put anywhere near a query. The pattern allows only
  // digits, a hyphen, hex and a short extension, so escaping the dot is the
  // only thing left to do to make it a literal.
  if (!uploadFileName(name)) return off(res);
  const endsWith = { $regex: `${name.replace(/\./g, "\\.")}$` };

  const [car, listing] = await Promise.all([
    Car.exists({ owner: agency._id, isDeleted: false, listed: true, photos: endsWith }),
    ListedCar.exists({ owner: agency._id, status: "approved", photos: endsWith }),
  ]);
  if (!car && !listing) return off(res);

  if (!streamUpload(res, name, "public, max-age=31536000, immutable")) return off(res);
});

/**
 * GET /api/public/rentals/cars, what there is, and what of it is free.
 *
 * With no dates it is the showroom: every published car. With dates it is an
 * answer, the same cars, each marked free or taken, because a customer who
 * cannot have the Alto this weekend still wants to see that it exists and that
 * something else is available.
 */
export const listPublicCars = catchAsync(async (req: Request, res: Response) => {
  const agency = await liveAgency();
  if (!agency) return off(res);
  const owner = agency._id;
  const selfDrive = agency.settings.selfDriveEnabled === true;

  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const dated = Boolean(from && to && to > from);

  const cars = await Car.find({ owner, isDeleted: false, status: "active", listed: true })
    .select(CAR_FIELDS)
    .sort({ withDriverRate: 1 })
    .lean();

  const takenIds = dated ? await heldIds(owner, "car", from as Date, to as Date) : new Set<string>();

  /**
   * Cars offered by owners outside the business, on the dates they offered
   * them.
   *
   * Approved only, and with a price the office set, an owner's asking price
   * is not a customer's price. **Without dates they are not shown at all**,
   * which is the one place this list behaves differently from Musafir's own
   * cars: a borrowed car is available on specific days, and putting it in a
   * general showroom would advertise something that is free three weekends a
   * year as though it were always there.
   */
  const listed = dated
    ? await ListedCar.find({ owner, status: "approved", publicDailyRate: { $gt: 0 } })
        .select(LISTING_FIELDS)
        .lean()
    : [];

  const listedTaken = dated
    ? await heldIds(owner, "listedCar", from as Date, to as Date)
    : new Set<string>();

  const partnerCars = listed
    .filter((car) => coversWindow(car.availability ?? [], from as Date, to as Date))
    .map((car) => ({
      id: String(car._id),
      make: car.make,
      model: car.model,
      year: car.year ?? null,
      color: car.color ?? null,
      seats: car.seats,
      fuelType: car.fuelType,
      transmission: car.transmission ?? null,
      features: [] as string[],
      photos: publicPhotos(car.photos),
      withDriverRate: car.publicDailyRate ?? null,
      // A borrowed car is never offered self-drive. That is not a setting; it
      // is the single largest risk in this business, and it is somebody else's
      // car to lose.
      selfDriveRate: null,
      kmIncludedPerDay: car.kmIncludedPerDay ?? null,
      extraKmRate: car.extraKmRate ?? null,
      description: car.description ?? null,
      available: !listedTaken.has(String(car._id)),
      /** Tells the booking form which collection this id belongs to. */
      source: "partner" as const,
    }));

  const own: PublicCarShape[] = cars.map((car) => ({
    ...publicCar(car, selfDrive),
    available: dated ? !takenIds.has(String(car._id)) : null,
  }));

  res.json({
    data: [...own, ...partnerCars],
    range: dated ? { from, to } : null,
  });
});

/**
 * GET /api/public/rentals/cars/:id, one car, for its own page.
 *
 * Musafir's own cars only. A borrowed car has no permanent page: it is on the
 * website for the days its owner offered it and gone again after, and a URL
 * that 404s half the year is worse than no URL.
 */
export const getPublicCar = catchAsync(async (req: Request, res: Response) => {
  const agency = await liveAgency();
  if (!agency) return off(res);
  const carId = req.params.id;
  if (typeof carId !== "string" || !Types.ObjectId.isValid(carId)) return off(res);

  const car = await Car.findOne({
    _id: carId,
    owner: agency._id,
    isDeleted: false,
    status: "active",
    listed: true,
  })
    .select(CAR_FIELDS)
    .lean();
  if (!car) return off(res);

  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const dated = Boolean(from && to && to > from);

  const taken = dated
    ? await Rental.exists({
        owner: agency._id,
        car: car._id,
        status: { $in: BLOCKING_STATUSES },
        startAt: { $lt: to },
        endAt: { $gt: from },
      })
    : null;

  res.json({
    data: {
      ...publicCar(car, agency.settings.selfDriveEnabled === true),
      available: dated ? !taken : null,
    },
  });
});

/**
 * POST /api/public/rentals/quote, what this booking would cost.
 *
 * The site quotes a total for the whole booking rather than a per-day figure
 * the customer has to do arithmetic on, and it counts the days with the same
 * function the booking itself will use, a quote that rounds differently from
 * the invoice is the argument the grace period exists to prevent.
 *
 * A quote is not a hold and says so. Nothing is written here.
 */
export const quotePublicRental = catchAsync(async (req: Request, res: Response) => {
  const agency = await liveAgency();
  if (!agency) return off(res);

  const body = req.body as Record<string, unknown>;
  const startAt = parseDate(body.startAt);
  const endAt = parseDate(body.endAt);
  if (!startAt || !endAt || endAt <= startAt) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Choose when you need the car and when you will return it." });
    return;
  }
  if (typeof body.carId !== "string" || !Types.ObjectId.isValid(body.carId)) {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({ message: "Choose a car." });
    return;
  }

  const withDriver = body.withDriver !== false;
  const days = rentalDays(startAt, endAt);

  let dailyRate: number | null = null;
  let kmIncludedPerDay: number | null = null;
  let extraKmRate: number | null = null;
  let label = "";

  const car = await Car.findOne({
    _id: body.carId,
    owner: agency._id,
    isDeleted: false,
    status: "active",
    listed: true,
  })
    .select(CAR_FIELDS)
    .lean();

  if (car) {
    const selfDriveOffered =
      agency.settings.selfDriveEnabled === true && typeof car.selfDriveRate === "number";
    if (!withDriver && !selfDriveOffered) {
      res
        .status(statusCodes.UNPROCESSABLE_ENTITY)
        .json({ message: "This car is only available with one of our drivers." });
      return;
    }
    dailyRate = (withDriver ? car.withDriverRate : car.selfDriveRate) ?? null;
    kmIncludedPerDay = car.kmIncludedPerDay ?? null;
    extraKmRate = car.extraKmRate ?? null;
    label = `${car.make} ${car.model}`;
  } else {
    const partner = await ListedCar.findOne({
      _id: body.carId,
      owner: agency._id,
      status: "approved",
      publicDailyRate: { $gt: 0 },
    })
      .select(LISTING_FIELDS)
      .lean();
    if (!partner) return off(res);
    if (!coversWindow(partner.availability ?? [], startAt, endAt)) {
      res.status(statusCodes.CONFLICT).json({
        message: "That car is not offered for all of those dates. Try a different car or shorter dates.",
      });
      return;
    }
    if (!withDriver) {
      res
        .status(statusCodes.UNPROCESSABLE_ENTITY)
        .json({ message: "This car comes with a driver." });
      return;
    }
    dailyRate = partner.publicDailyRate ?? null;
    kmIncludedPerDay = partner.kmIncludedPerDay ?? null;
    extraKmRate = partner.extraKmRate ?? null;
    label = `${partner.make} ${partner.model}`;
  }

  if (!dailyRate) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "We do not have a price for that car online. Please call us." });
    return;
  }

  res.json({
    data: {
      car: label,
      days,
      dailyRate,
      rentAmount: days * dailyRate,
      kmIncluded: kmIncludedPerDay ? kmIncludedPerDay * days : null,
      kmIncludedPerDay,
      extraKmRate,
      securityDeposit: agency.settings.defaultSecurityDeposit || null,
      withDriver,
      currency: agency.settings.currency,
      /**
       * Said out loud on every quote, because it is the difference between a
       * price and a promise, and a customer who thinks they have a car when
       * they do not is the worst outcome this page can produce.
       */
      note: "This is a quote, not a booking. Nothing is held until we confirm it with you.",
    },
  });
});

/**
 * POST /api/public/rentals/requests, a booking request from the website.
 *
 * Lands as an `enquiry`, which is the whole point: it holds no car, blocks
 * nothing, and commits the business to nothing until somebody reads it and
 * confirms. A stranger on the internet cannot take a car off the road.
 */
export const createPublicRequest = catchAsync(async (req: Request, res: Response) => {
  const agency = await liveAgency();
  if (!agency) return off(res);
  const owner = agency._id;

  const body = req.body as Record<string, unknown>;
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const startAt = parseDate(body.startAt);
  const endAt = parseDate(body.endAt);

  if (fullName.length < 2 || phone.length < 7) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Please give your name and a phone number we can reach you on." });
    return;
  }
  if (!startAt || !endAt || endAt <= startAt) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Please choose when you need the car and when you will return it." });
    return;
  }
  // A request for a car a year out is not a booking, it is a typo or a bot.
  const oneYear = Date.now() + 365 * 86_400_000;
  if (startAt.getTime() > oneYear) {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({ message: "That date is too far ahead." });
    return;
  }

  // The car is a PREFERENCE, never a hold: it is checked for being published
  // and then written down, and an admin decides whether it is really free.
  //
  // Which collection the id belongs to is resolved here rather than trusted
  // from the request, a `source` field the browser sent is a claim, and
  // looking the id up in the wrong collection is how a customer's request for
  // somebody's Corolla becomes a request for one of Musafir's own.
  let car: Types.ObjectId | undefined;
  let listedCar: Types.ObjectId | undefined;
  if (typeof body.carId === "string" && Types.ObjectId.isValid(body.carId)) {
    const found = await Car.findOne({
      _id: body.carId,
      owner,
      isDeleted: false,
      listed: true,
    })
      .select("_id")
      .lean();
    if (found) {
      car = found._id;
    } else {
      const partner = await ListedCar.findOne({
        _id: body.carId,
        owner,
        status: "approved",
      })
        .select("_id")
        .lean();
      if (partner) listedCar = partner._id;
    }
  }

  // Self-drive is only ever one of Musafir's own cars, and only while the
  // business has it switched on. A request that asks for it otherwise is
  // recorded as chauffeur-driven rather than refused, the office will call.
  const askedSelfDrive = body.withDriver === false;
  const withDriver = !(askedSelfDrive && car && agency.settings.selfDriveEnabled === true);

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";

  const rental = await Rental.create({
    owner,
    car,
    listedCar,
    withDriver,
    customer: {
      fullName,
      phone,
      cnic: typeof body.cnic === "string" ? body.cnic : undefined,
      address: typeof body.address === "string" ? body.address.trim().slice(0, 300) : undefined,
    },
    startAt,
    endAt,
    // Priced when the office answers. Publishing a rate and then quoting a
    // different one is how a booking becomes an argument before it starts.
    dailyRate: 0,
    securityDeposit: agency.settings.defaultSecurityDeposit || 0,
    status: "enquiry",
    notes: [
      notes,
      email ? `Email: ${email}` : "",
      askedSelfDrive && withDriver ? "Asked for self-drive, not offered on this car." : "",
      "Requested on musafircars.com",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  await notifyAgencyAdmins(owner, {
    title: "New booking request, musafircars.com",
    // No name, no number: this goes through a push vendor and comes to rest in
    // an OS notification log.
    body: "Somebody has asked for a car. Open Bookings to see the dates.",
    data: { type: "rental:requested", rentalId: String(rental._id) },
  }).catch(() => undefined);

  emitToOwner(String(owner), "rental:updated", { rentalId: String(rental._id) });

  res.status(statusCodes.CREATED).json({
    data: { reference: String(rental._id).slice(-6).toUpperCase() },
    message: "Request received.",
  });
});
