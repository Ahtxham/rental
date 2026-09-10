import { Request, Response, NextFunction } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { Admin } from "@/models/admin-model";
import { Lender } from "@/models/lender-model";
import { getAgencySnapshot } from "@/services/agency-cache";
import { verifyToken } from "@/utils/jwt-helper";

/**
 * Two kinds of account reach this API, and they must never be confused.
 *
 * An **admin** works in the Musafir office and can see every booking, every
 * customer's phone number and every car owner's terms. A **lender** owns one
 * or two cars, is a member of the public, and may only ever see their own.
 * Drivers have no account at all any more, the roster is a list the office
 * keeps, not a login.
 */

const unauthorized = (res: Response, message = "Access denied. Invalid token.") =>
  res.status(statusCodes.UNAUTHORIZED).json({ message });

// A token minted before a password change must stop working immediately.
const versionMatches = (tokenVersion: number | undefined, accountVersion: number | undefined) =>
  (tokenVersion ?? 0) === (accountVersion ?? 0);

const suspended = (res: Response) =>
  res.status(statusCodes.FORBIDDEN).json({
    message: "This account is not available right now. Please contact support.",
    code: "AGENCY_SUSPENDED",
  });

/**
 * Decodes { id, accountType } from the Bearer token, loads the matching
 * account, and attaches `req.user`, `req.accountType`, `req.agency` and
 * `req.ownerId`, the id every downstream query must be scoped by.
 *
 * Live state is re-checked on every request rather than trusted from the
 * token: suspending somebody has to take effect now, not up to a week from now
 * when their token would have expired anyway.
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      unauthorized(res, "Access denied. No token provided.");
      return;
    }

    const decoded = verifyToken(token);
    req.tokenExp = decoded.exp;

    if (decoded.accountType === "admin") {
      const admin = await Admin.findOne({ _id: decoded.id, status: "active" });
      if (!admin || !admin.agency || !versionMatches(decoded.tv, admin.tokenVersion)) {
        unauthorized(res);
        return;
      }

      const agency = await getAgencySnapshot(admin.agency.toString());
      if (!agency) {
        unauthorized(res);
        return;
      }
      if (agency.status !== "active") {
        suspended(res);
        return;
      }

      req.user = admin;
      req.accountType = "admin";
      req.agency = agency;
      req.ownerId = agency._id.toString();
    } else if (decoded.accountType === "lender") {
      /**
       * A car owner from outside the business.
       *
       * `req.ownerId` is set, because a lender belongs to the business they
       * signed up to and everything they list lives there, but that id is NOT
       * a licence to reach the office's routes. Every one of those mounts
       * `adminOnly`, which refuses this account type, and the lender's own
       * routes mount `lenderOnly`, which refuses everybody else. A "pending"
       * lender can sign in and use their account; what they cannot do is have
       * a car published, and that is enforced where listings are approved.
       */
      const lender = await Lender.findById(decoded.id);
      if (
        !lender ||
        lender.status === "suspended" ||
        !versionMatches(decoded.tv, lender.tokenVersion)
      ) {
        unauthorized(res);
        return;
      }

      const agency = await getAgencySnapshot(lender.owner.toString());
      if (!agency) {
        unauthorized(res);
        return;
      }
      if (agency.status !== "active") {
        suspended(res);
        return;
      }

      req.user = lender;
      req.accountType = "lender";
      req.agency = agency;
      req.ownerId = lender.owner.toString();
    } else {
      unauthorized(res);
      return;
    }

    next();
  } catch (error) {
    unauthorized(res, error instanceof Error ? error.message : "Invalid token.");
  }
};

/**
 * The lender's own routes, and nothing else.
 *
 * Deliberately does NOT let an admin through. An admin managing listings does
 * it through `/api/rentals/listings`, which is audited; if they could reach
 * these routes too, "the owner edited their own car" and "somebody in the
 * office edited it for them" would be the same event in the record.
 */
export const lenderOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.accountType === "lender") {
    next();
    return;
  }
  res.status(statusCodes.FORBIDDEN).json({ message: "This is a car owner's area." });
};

/** The office's routes. */
export const adminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.accountType === "admin") {
    next();
    return;
  }
  res.status(statusCodes.FORBIDDEN).json({ message: "Admin access required." });
};

/**
 * Last line of defence: no request reaches a scoped controller without a
 * resolved `ownerId`. Mounted on every domain router. It is belt-and-braces
 * behind `authMiddleware`, and it stays because the failure it prevents,
 * Mongoose silently dropping an undefined filter key, is invisible in review.
 */
export const requireAgencyScope = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.ownerId) {
    res.status(statusCodes.FORBIDDEN).json({
      message: "This request is not scoped to a business.",
      code: "AGENCY_NOT_RESOLVED",
    });
    return;
  }
  next();
};
