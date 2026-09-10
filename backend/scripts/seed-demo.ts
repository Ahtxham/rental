/**
 * Demo data for local work — a handful of cars, a driver, and one car offered
 * by an outside owner, so the website has something to render.
 *
 *   yarn seed:demo
 *
 * **Refuses to run with MODE=production.** This writes fictional cars with
 * invented registration numbers, and the one thing worse than an empty rental
 * site is one advertising a Corolla that does not exist.
 *
 * Idempotent by registration number: running it twice adds nothing.
 */
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import { MODE, PUBLIC_AGENCY_ID } from "@/constants/env";
import { Agency } from "@/models/agency-model";
import { Car } from "@/models/car-model";
import { Driver } from "@/models/driver-model";
import { Lender } from "@/models/lender-model";
import { ListedCar } from "@/models/listed-car-model";
import { hashPassword } from "@/utils/password-helper";

const CARS = [
  {
    registrationNumber: "LEA-2481",
    make: "Toyota",
    model: "Corolla Altis",
    year: 2022,
    color: "white",
    seats: 5,
    fuelType: "petrol" as const,
    transmission: "automatic" as const,
    features: ["Air conditioning", "Cruise control", "Two suitcases"],
    withDriverRate: 9500,
    selfDriveRate: 7000,
    kmIncludedPerDay: 200,
    extraKmRate: 35,
    description: "The default choice for a day of meetings or an airport run.",
  },
  {
    registrationNumber: "LEB-7742",
    make: "Honda",
    model: "City",
    year: 2021,
    color: "silver",
    seats: 5,
    fuelType: "petrol" as const,
    transmission: "automatic" as const,
    features: ["Air conditioning", "One suitcase"],
    withDriverRate: 8000,
    selfDriveRate: 6000,
    kmIncludedPerDay: 200,
    extraKmRate: 30,
    description: "Lighter on fuel than the Corolla and easier through old Lahore.",
  },
  {
    registrationNumber: "LEC-1109",
    make: "Suzuki",
    model: "Alto",
    year: 2023,
    color: "grey",
    seats: 4,
    fuelType: "petrol" as const,
    transmission: "manual" as const,
    features: ["Air conditioning"],
    withDriverRate: 5500,
    selfDriveRate: 4000,
    kmIncludedPerDay: 150,
    extraKmRate: 25,
    description: "Cheapest way to have a car and a driver for the whole day.",
  },
  {
    registrationNumber: "LED-3350",
    make: "Toyota",
    model: "Hiace Grand Cabin",
    year: 2019,
    color: "white",
    seats: 13,
    fuelType: "diesel" as const,
    transmission: "manual" as const,
    features: ["Air conditioning", "Luggage rack", "Reclining seats"],
    withDriverRate: 18000,
    kmIncludedPerDay: 250,
    extraKmRate: 55,
    description: "For a family, a wedding party, or a run up to Murree.",
  },
  {
    registrationNumber: "LEE-8890",
    make: "Kia",
    model: "Sportage",
    year: 2023,
    color: "black",
    seats: 5,
    fuelType: "petrol" as const,
    transmission: "automatic" as const,
    features: ["Air conditioning", "Panoramic roof", "Two suitcases"],
    withDriverRate: 16000,
    kmIncludedPerDay: 200,
    extraKmRate: 60,
    description: "When the car is part of the impression you are making.",
  },
];

const seedDemo = async () => {
  if (MODE === "production") {
    console.error("Refusing to seed demo data with MODE=production.");
    process.exit(1);
  }

  await connectDB();

  const agency = PUBLIC_AGENCY_ID
    ? await Agency.findById(PUBLIC_AGENCY_ID)
    : await Agency.findOne();
  if (!agency) {
    console.error("No business found. Run `yarn seed:agency` first.");
    process.exit(1);
  }
  const owner = agency._id;

  // Settings the office would normally fill in on its first day. Written only
  // when they are still at their defaults, so a real edit is never overwritten.
  if (!agency.phone) {
    agency.phone = "+92 300 8888888";
    agency.whatsapp = "923008888888";
    agency.email = "hello@musafircars.com";
    agency.city = "Lahore";
    agency.address = "Gulberg III, Lahore";
    agency.settings.selfDriveEnabled = true;
    agency.settings.defaultSecurityDeposit = 25_000;
    agency.settings.defaultKmIncludedPerDay = 200;
    agency.settings.defaultExtraKmRate = 35;
    await agency.save();
  }

  /**
   * Add what is missing, and put back what was removed.
   *
   * Soft-deleted demo cars are restored rather than skipped: a local database
   * gets poked at, and a seed that silently declines to recreate the car you
   * deleted five minutes ago is a seed you stop trusting. Only the two fields
   * that hide a car are reset; anything else you edited is left alone, because
   * re-running this must not undo work.
   */
  let added = 0;
  let restored = 0;
  for (const car of CARS) {
    const exists = await Car.findOne({ owner, registrationNumber: car.registrationNumber });
    if (exists) {
      if (exists.isDeleted) {
        exists.isDeleted = false;
        exists.listed = true;
        await exists.save();
        restored += 1;
      }
      continue;
    }
    await Car.create({ ...car, owner, listed: true, currentOdometer: 40_000 });
    added += 1;
  }

  const driver =
    (await Driver.findOne({ owner, phone: "+92 300 1112223" })) ??
    (await Driver.create({
      owner,
      fullName: "Zaheer Abbas",
      phone: "+92 300 1112223",
      licenceNumber: "LHR-DL-99871",
      licenceExpiry: new Date("2029-04-30"),
    }));

  // Somebody outside the business, so the lender side has something in it.
  const lender =
    (await Lender.findOne({ email: "owner@example.com" })) ??
    (await Lender.create({
      owner,
      fullName: "Bilal Ahmed",
      email: "owner@example.com",
      password: await hashPassword("Owner@12345"),
      phone: "+92 321 4445556",
      city: "Lahore",
      status: "active",
    }));

  const listingExists = await ListedCar.findOne({ owner, registrationNumber: "LEF-6621" });
  if (!listingExists) {
    const today = new Date();
    const in90 = new Date(today.getTime() + 90 * 86_400_000);
    await ListedCar.create({
      owner,
      lender: lender._id,
      make: "Honda",
      model: "Civic",
      year: 2020,
      color: "blue",
      seats: 5,
      fuelType: "petrol",
      transmission: "automatic",
      registrationNumber: "LEF-6621",
      description: "Kept in a garage and serviced at the dealership.",
      expectedDailyRate: 9000,
      publicDailyRate: 12000,
      kmIncludedPerDay: 200,
      extraKmRate: 45,
      driverBy: "fleet",
      availability: [{ from: today, to: in90 }],
      status: "approved",
    });
  }

  console.log(
    `Demo data ready: ${added} car(s) added, ${restored} restored, driver ${driver.fullName}, 1 partner car.`,
  );
  console.log(`Lender login: owner@example.com / Owner@12345`);

  await mongoose.connection.close();
};

seedDemo().catch((error) => {
  console.error(error);
  process.exit(1);
});
