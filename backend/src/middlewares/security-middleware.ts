import { Request, Response, NextFunction } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import { getRedisClient } from "@/config/redis";
import { statusCodes } from "@/constants/statusCodes";

const getClientIp = (req: Request): string =>
  (req.ip ?? req.socket?.remoteAddress ?? "unknown").replace(/^::ffff:/, "");

// Every IP-derived key goes through `ipKeyGenerator`, which buckets IPv6 by
// its /56 subnet instead of the full address. A single IPv6 customer is
// routinely handed a /64, keying on the exact address would give a brute
// forcer an effectively unlimited supply of fresh buckets from one connection,
// silently voiding the limits below. IPv4 passes through unchanged.
const ipKey = (req: Request): string => ipKeyGenerator(getClientIp(req));

const isRedisReady = (): boolean => {
  const redis = getRedisClient();
  return !!redis && redis.status === "ready";
};

const buildStore = () => {
  if (!isRedisReady()) return undefined;
  const redis = getRedisClient();
  return new RedisStore({
    sendCommand: (...args: string[]) => (redis as unknown as { call: (...a: string[]) => Promise<never> }).call(...args),
  });
};

// Generous catch-all limiter for every /api request, curbs scraping/abuse
// without throttling a normal authenticated dashboard.
export const globalApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore(),
  keyGenerator: (req: Request) => ipKey(req),
  handler: (_req: Request, res: Response) => {
    res.status(statusCodes.TOO_MANY_REQUESTS).json({ message: "Too many requests. Please slow down." });
  },
});

// Strict limiter for /api/auth, login, OTP and password-reset endpoints are
// the ones worth brute-forcing.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore(),
  keyGenerator: (req: Request) => ipKey(req),
  handler: (_req: Request, res: Response) => {
    res.status(statusCodes.TOO_MANY_REQUESTS).json({ message: "Too many attempts. Try again later." });
  },
});

// Per-ACCOUNT login throttle, layered under the per-IP one.
//
// IP limiting alone protects neither side of this: Pakistani carriers put a
// whole neighbourhood behind one CGNAT address, so a shared IP locks out
// innocent people, while an attacker rotating cheap proxies gets unlimited
// attempts at a single account. Keying on the submitted email bounds
// credential-stuffing regardless of where it comes from.
//
// `skipSuccessfulRequests` means somebody who signs in normally is never
// counted, only failures burn the budget.
export const loginAccountRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore(),
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
    return `login:${email || ipKey(req)}`;
  },
  handler: (_req: Request, res: Response) => {
    res.status(statusCodes.TOO_MANY_REQUESTS).json({
      message: "Too many failed attempts for this account. Try again in 15 minutes.",
      code: "ACCOUNT_LOCKED_OUT",
    });
  },
});

/**
 * musafircars.com.
 *
 * Browsing is cheap and gets a loose budget, a customer comparing dates
 * refreshes a lot, and a whole carrier sits behind one CGNAT address, so a
 * tight cap would silently swallow a real booking because a stranger on the
 * same network browsed first. Submitting a request is the one that writes, so
 * it is tighter: a genuine customer sends one, maybe two.
 */
export const publicBrowseRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore(),
  keyGenerator: (req: Request) => `public-browse:${ipKey(req)}`,
  handler: (_req: Request, res: Response) => {
    res.status(statusCodes.TOO_MANY_REQUESTS).json({ message: "Too many requests. Please slow down." });
  },
});

export const publicRequestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore(),
  keyGenerator: (req: Request) => `public-request:${ipKey(req)}`,
  handler: (_req: Request, res: Response) => {
    res.status(statusCodes.TOO_MANY_REQUESTS).json({
      message: "Too many requests from this connection. Please call us instead.",
    });
  },
});

// Recursively strip MongoDB operator keys ($... and dotted keys) in place.
// Neutralises NoSQL operator-injection payloads such as { email: { $gt: "" } }
// before they reach any Mongoose query.
const stripMongoOperators = (value: unknown, depth = 0): void => {
  if (depth > 10 || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => stripMongoOperators(item, depth + 1));
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    stripMongoOperators((value as Record<string, unknown>)[key], depth + 1);
  }
};

// Sanitize body, query, and params against NoSQL operator injection.
export const mongoSanitize = (req: Request, _res: Response, next: NextFunction) => {
  stripMongoOperators(req.body);
  stripMongoOperators(req.params);

  // `req.query` is a getter in Express 5 that re-parses the query string on
  // every access, so deleting keys from it does NOT stick, the handler would
  // still receive the unsanitized object and this middleware would be a no-op.
  // Replace the property with a sanitized snapshot instead.
  if (req.query && typeof req.query === "object") {
    const sanitized = { ...req.query };
    stripMongoOperators(sanitized);
    Object.defineProperty(req, "query", {
      value: sanitized,
      configurable: true,
      enumerable: true,
      writable: false,
    });
  }
  next();
};
