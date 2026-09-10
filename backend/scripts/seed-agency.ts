/**
 * Bootstrap seed — creates the business and its founding account, and nothing
 * else. No wipes, no demo data: safe to run against a live database.
 *
 *   # backend/.env (or inline):
 *   #   ADMIN_EMAIL=owner@musafircars.com   (required)
 *   #   ADMIN_PASSWORD=…                    (required, >= 8 chars)
 *   #   ADMIN_NAME="Ahtsham"                (optional)
 *   #   ADMIN_PHONE="+92 300 1234567"       (optional)
 *   #   AGENCY_NAME="Musafir Rent A Car"    (optional)
 *   #   AGENCY_CITY="Lahore"                (optional)
 *   yarn seed:agency
 *
 * It prints the agency's `_id`. Put that in `PUBLIC_AGENCY_ID` in backend/.env
 * and restart, or musafircars.com stays switched off — see constants/env.ts.
 *
 * Idempotent: if the email already exists it changes nothing, unless
 * ADMIN_RESET=1 is set, which updates that account's password instead.
 */
import mongoose from "mongoose";

import { connectDB } from "@/config/db";
import { Admin } from "@/models/admin-model";
import { Agency } from "@/models/agency-model";
import { hashPassword } from "@/utils/password-helper";

const seedAgency = async () => {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !email.includes("@")) {
    console.error("ADMIN_EMAIL is required (backend/.env or inline).");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD is required and must be at least 8 characters.");
    process.exit(1);
  }

  await connectDB();

  const existing = await Admin.findOne({ email }).select("_id email agency");
  if (existing) {
    if (process.env.ADMIN_RESET === "1") {
      await Admin.updateOne(
        { _id: existing._id },
        {
          $set: { password: await hashPassword(password) },
          // Tokens carry `tv` and authMiddleware rejects a mismatch. Without
          // this bump an already-issued token keeps working for the rest of its
          // 7-day life — and this path is exactly what gets run when an account
          // is believed compromised.
          $inc: { tokenVersion: 1 },
        },
      );
      console.log(`Password updated for ${email}. Existing sessions revoked.`);
    } else {
      console.log(`${email} already exists — nothing changed.`);
      console.log("(set ADMIN_RESET=1 to update that account's password)");
    }
    if (existing.agency) console.log(`PUBLIC_AGENCY_ID=${existing.agency}`);
    await mongoose.connection.close();
    return;
  }

  const name = process.env.AGENCY_NAME || "Musafir Rent A Car";
  const agency =
    (await Agency.findOne({ name })) ??
    (await Agency.create({
      name,
      legalName: process.env.AGENCY_LEGAL_NAME || name,
      phone: process.env.AGENCY_PHONE || "",
      whatsapp: process.env.AGENCY_WHATSAPP || process.env.AGENCY_PHONE || "",
      email: process.env.AGENCY_EMAIL || email,
      city: process.env.AGENCY_CITY || "Lahore",
      address: process.env.AGENCY_ADDRESS || "",
    }));

  const admin = await Admin.create({
    email,
    password: await hashPassword(password),
    fullName: process.env.ADMIN_NAME || "Owner",
    phone: process.env.ADMIN_PHONE || "-",
    agency: agency._id,
    isAgencyOwner: true,
  });

  console.log(`Created ${agency.name} and its founding account ${admin.email}.`);
  console.log("");
  console.log("Add this to backend/.env and restart, or the website stays off:");
  console.log(`  PUBLIC_AGENCY_ID=${agency._id}`);

  await mongoose.connection.close();
};

seedAgency().catch((error) => {
  console.error(error);
  process.exit(1);
});
