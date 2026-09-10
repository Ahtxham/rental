import jwt, { SignOptions } from "jsonwebtoken";

import { JWT_EXPIRES_IN, JWT_SECRET } from "@/constants/env";

/**
 * Two kinds of account, and they must never be confused: somebody who works in
 * the office, and a member of the public who has lent us a car.
 */
export type AccountType = "admin" | "lender";

export interface JwtPayload {
  id: string;
  accountType: AccountType;
  /**
   * The account's `tokenVersion` when this token was minted. Tokens issued
   * before this field existed carry `undefined`, which is treated as 0 so
   * existing sessions survive the upgrade until their next password change.
   */
  tv?: number;
  /** Set by `jwt.verify`, never by us. Seconds since epoch. */
  exp?: number;
}

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, JWT_SECRET) as JwtPayload;
