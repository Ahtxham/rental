import { Request, Response } from "express";

import { MODE } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";
import { Admin } from "@/models/admin-model";
import { Agency, AgencyDocument } from "@/models/agency-model";
import { invalidateAgency } from "@/services/agency-cache";
import { disconnectAccount } from "@/services/socket-service";
import { catchAsync } from "@/utils/catch-async";
import { signToken } from "@/utils/jwt-helper";
import { comparePassword, generateOtp, hashPassword } from "@/utils/password-helper";

const OTP_TTL_MS = 10 * 60 * 1000;

/**
 * The office's own sign-in.
 *
 * Car owners do NOT come through here, they have their own signup, their own
 * login and their own guard under `/api/lenders/auth/*`. Keeping the two apart
 * means no code path can ever hand a member of the public an admin token
 * because their email happened to match.
 */

// POST /api/auth/login
export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};

  // Type-guard auth inputs, objects like { $gt: "" } must never reach the query
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(statusCodes.BAD_REQUEST).json({ message: "Email and password are required." });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const admin = await Admin.findOne({ email: normalizedEmail }).select("+password");
  if (!admin || !admin.password || !(await comparePassword(password, admin.password))) {
    res.status(statusCodes.UNAUTHORIZED).json({ message: "Invalid email or password." });
    return;
  }

  if (admin.status !== "active") {
    res
      .status(statusCodes.FORBIDDEN)
      .json({ message: "Your account has been suspended. Contact the owner." });
    return;
  }

  const agency = admin.agency ? await Agency.findById(admin.agency) : null;
  if (!agency) {
    res
      .status(statusCodes.FORBIDDEN)
      .json({ message: "Your account is not linked to a business. Contact support." });
    return;
  }
  if (agency.status !== "active") {
    res.status(statusCodes.FORBIDDEN).json({
      message: "This account is not available right now. Please contact support.",
      code: "AGENCY_SUSPENDED",
    });
    return;
  }

  const token = signToken({
    id: admin._id.toString(),
    accountType: "admin",
    tv: admin.tokenVersion ?? 0,
  });
  // Targeted write, re-saving the whole document on every login would rewrite
  // the password hash and re-run every validator for one timestamp.
  await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });

  res.json({
    token,
    accountType: "admin",
    user: admin.toJSON(),
    agency: agency.toJSON(),
  });
});

// POST /api/auth/logout. JWTs are stateless; the client clears its own storage
export const logout = catchAsync(async (_req: Request, res: Response) => {
  res.json({ message: "Logged out." });
});

/**
 * Renew a token before it dies rather than after.
 *
 * Any session within a day of expiry is handed a fresh token on the way past,
 * so somebody who opens the admin even once a week never sees a login screen.
 *
 * Deliberately not a refresh-token flow. Rotation needs storage, revocation and
 * a second endpoint; this needs none of them and keeps tokens short-lived, so
 * `tokenVersion` stays a working kill switch.
 */
const RENEW_WHEN_REMAINING_MS = 24 * 60 * 60 * 1000;

const renewedToken = (req: Request): string | undefined => {
  if (!req.tokenExp || !req.user || !req.accountType) return undefined;
  const remainingMs = req.tokenExp * 1000 - Date.now();
  if (remainingMs > RENEW_WHEN_REMAINING_MS) return undefined;
  return signToken({
    id: req.user._id.toString(),
    accountType: req.accountType,
    tv: (req.user as { tokenVersion?: number }).tokenVersion ?? 0,
  });
};

// GET /api/auth/me
export const me = catchAsync(async (req: Request, res: Response) => {
  // Only present when it was due, the client stores it if it is there and
  // carries on with the old one when it is not.
  const token = renewedToken(req);

  res.json({
    ...(token ? { token } : {}),
    accountType: req.accountType,
    user: req.user?.toJSON(),
    agency: req.agency ?? null,
  });
});

/**
 * PATCH /api/auth/me, explicit allowlists, never raw `req.body`.
 *
 * Two different things are editable here, the person and the business, and
 * they are deliberately kept in **separate parts of the body**:
 *
 *   { fullName, phone, photo, currentPassword, newPassword,
 *     agency: { name, phone, whatsapp, email, address, city, ...settings } }
 *
 * They used to be flat, and `phone` was in both allowlists. Saving the office
 * Settings screen therefore wrote the BUSINESS number over the signed in
 * person's own, silently, and clearing it answered 500 because `Admin.phone`
 * is required. A single key must never mean two things.
 *
 * Both still travel in one request, because to whoever is using it there is
 * one settings page, not two.
 */
export const updateMe = catchAsync(async (req: Request, res: Response) => {
  const body = req.body ?? {};

  if (req.accountType !== "admin") {
    res.status(statusCodes.FORBIDDEN).json({ message: "Admin access required." });
    return;
  }

  const admin = await Admin.findById(req.user!._id).select("+password");
  if (!admin) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Account not found." });
    return;
  }

  // The person. Their own name, their own number.
  const allowed = ["fullName", "phone", "photo"] as const;
  for (const key of allowed) {
    if (body[key] !== undefined) {
      (admin as unknown as Record<string, unknown>)[key] = body[key];
    }
  }

  if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
    if (
      typeof body.currentPassword !== "string" ||
      !admin.password ||
      !(await comparePassword(body.currentPassword, admin.password))
    ) {
      res.status(statusCodes.UNAUTHORIZED).json({ message: "Current password is incorrect." });
      return;
    }
    if (body.newPassword.length < 8) {
      res
        .status(statusCodes.UNPROCESSABLE_ENTITY)
        .json({ message: "New password must be at least 8 characters." });
      return;
    }
    admin.password = await hashPassword(body.newPassword);
    // Signs every other device out, that is the point of changing it.
    admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
    disconnectAccount(admin._id.toString());
  }

  await admin.save();

  /**
   * The business's own record. `req.agency` is a cached snapshot, so the write
   * goes through a freshly loaded document and then invalidates the cache,
   * otherwise a settings change would take up to a TTL to take effect, and
   * longer still on another instance.
   */
  let updatedAgency: AgencyDocument | null = null;
  // The business, from its own part of the body. See the note above: flat
  // fields shared here with the person's and one of them collided.
  const agencyBody = (body.agency ?? {}) as Record<string, unknown>;
  if (req.ownerId) {
    const AGENCY_FIELDS = [
      "name",
      "legalName",
      "phone",
      "whatsapp",
      "email",
      "address",
      "city",
      "logo",
    ] as const;
    const SETTINGS_FIELDS = [
      "currency",
      "commissionPercent",
      "defaultSecurityDeposit",
      "defaultKmIncludedPerDay",
      "defaultExtraKmRate",
      "selfDriveEnabled",
    ] as const;

    const touchesAgency =
      AGENCY_FIELDS.some((key) => agencyBody[key] !== undefined) ||
      SETTINGS_FIELDS.some((key) => agencyBody[key] !== undefined);

    if (touchesAgency) {
      updatedAgency = await Agency.findById(req.ownerId);
      if (updatedAgency) {
        for (const key of AGENCY_FIELDS) {
          if (agencyBody[key] !== undefined) {
            (updatedAgency as unknown as Record<string, unknown>)[key] = agencyBody[key];
          }
        }
        for (const key of SETTINGS_FIELDS) {
          if (agencyBody[key] !== undefined) {
            (updatedAgency.settings as unknown as Record<string, unknown>)[key] = agencyBody[key];
          }
        }
        await updatedAgency.save();
        invalidateAgency(updatedAgency._id);
      }
    }
  }

  res.json({ user: admin.toJSON(), agency: updatedAgency ? updatedAgency.toJSON() : null });
});

/**
 * POST /api/auth/push-subscription, the browser reports whether this account
 * can receive push notifications.
 *
 * No device token crosses this boundary. The client sets the admin's `_id` as
 * their OneSignal external id and simply says whether permission was granted,
 * so there is nothing here worth stealing and no token table to keep in step.
 */
export const setPushSubscription = catchAsync(async (req: Request, res: Response) => {
  const subscribed = (req.body ?? {}).subscribed;

  if (typeof subscribed !== "boolean") {
    res.status(statusCodes.BAD_REQUEST).json({ message: "subscribed must be true or false." });
    return;
  }
  if (req.accountType !== "admin") {
    res.status(statusCodes.FORBIDDEN).json({ message: "Admin access required." });
    return;
  }

  const now = new Date();
  // Both dates are kept, never cleared: "subscribed, having previously opted
  // out" is a different story from "never asked", and whoever is asking why a
  // booking request sat unanswered deserves to know which one they are seeing.
  const update = subscribed ? { pushSubscribedAt: now } : { pushOptedOutAt: now };
  await Admin.updateOne({ _id: req.user!._id }, { $set: update });

  res.json({
    data: { subscribed },
    message: subscribed ? "Notifications enabled." : "Notifications disabled.",
  });
});

// POST /api/auth/forgot-password, always responds 200 to prevent user enumeration
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  const generic = { message: "If that email exists, a reset code has been sent." };

  if (typeof email !== "string") {
    res.json(generic);
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const admin = await Admin.findOne({ email: normalizedEmail });

  if (admin) {
    const otp = generateOtp();
    admin.otp = await hashPassword(otp);
    admin.otpExpires = new Date(Date.now() + OTP_TTL_MS);
    await admin.save();
    // Email delivery is out of scope for v1, so the OTP is surfaced in the
    // server log for development only. In production that would write a live
    // account-takeover credential into PM2 logs and any log aggregator, so it
    // is withheld, wire up real delivery before enabling resets in prod.
    if (MODE === "production") {
      console.log(
        `[auth] Password reset requested for ${normalizedEmail} (code withheld in production)`,
      );
    } else {
      console.log(`[auth] Password reset OTP for ${normalizedEmail}: ${otp}`);
    }
  }

  res.json(generic);
});

// POST /api/auth/reset-password
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof otp !== "string" ||
    typeof newPassword !== "string" ||
    newPassword.length < 8
  ) {
    res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "Email, code, and a password of at least 8 characters are required." });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const admin = await Admin.findOne({ email: normalizedEmail }).select("+otp +otpExpires +password");

  const otpValid =
    admin?.otp &&
    admin.otpExpires &&
    admin.otpExpires.getTime() > Date.now() &&
    (await comparePassword(otp, admin.otp));

  if (!admin || !otpValid) {
    res.status(statusCodes.UNAUTHORIZED).json({ message: "Invalid or expired reset code." });
    return;
  }

  admin.password = await hashPassword(newPassword);
  // A reset is often "someone else had my account", drop every live session.
  admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
  admin.otp = undefined;
  admin.otpExpires = undefined;
  await admin.save();
  disconnectAccount(admin._id.toString());

  res.json({ message: "Password has been reset. You can now log in." });
});
