import dotenv from "dotenv";
// `quiet` suppresses the banner dotenv 17 prints on every load, it lands in
// the PM2 logs on each restart and says nothing useful about a healthy boot.
dotenv.config({ quiet: true });

// 5013 rather than 4000: it is the port this product is actually deployed
// on, and a default that matches production is one less thing to discover.
export const PORT = process.env.PORT || 5013;
export const MODE = process.env.MODE || "development";
export const DB_URI = process.env.DB_URI || "mongodb://localhost:27017/musafir";
export const JWT_SECRET = process.env.JWT_SECRET || "";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "";

// Redis (optional, enables distributed rate limiting and socket scaling)
export const REDIS_URL = process.env.REDIS_URL || "";

// AWS S3 Configuration (optional, local disk fallback when unset)
export const AWS = {
  REGION: process.env.AWS_REGION || "us-east-1",
  ACCESSKEYID: process.env.AWS_ACCESSKEYID || "",
  SECRETACCESSKEY: process.env.AWS_SECRETACCESSKEY || "",
  BUCKET_NAME: process.env.AWS_BUCKET_NAME || "",
};

// In-process daily DB backup → S3 (runs only when a bucket is configured)
export const BACKUP = {
  BUCKET: process.env.BACKUP_S3_BUCKET || process.env.AWS_BUCKET_NAME || "",
  PREFIX: process.env.BACKUP_S3_PREFIX || "backups/musafir",
  CRON: process.env.BACKUP_CRON || "0 0 * * *",
  TZ: process.env.BACKUP_TZ || "Asia/Karachi",
  KEEP: parseInt(process.env.BACKUP_KEEP || "30", 10),
};

// Push notifications (OneSignal).
//
// Unset APP_ID/API_KEY leaves push disabled and every send a logged no-op,
// the same shape as the S3 backup config, so a dev machine or a deployment
// without a OneSignal account runs normally instead of erroring per alert.
export const PUSH = {
  ONESIGNAL_APP_ID: process.env.ONESIGNAL_APP_ID || "",
  ONESIGNAL_API_KEY: process.env.ONESIGNAL_API_KEY || "",
  /**
   * OneSignal's current REST keys authenticate as `Key <token>`. Older
   * ("legacy") REST API keys from a pre-2024 app authenticate as `Basic
   * <token>` instead, and the only symptom of getting it wrong is a 401. Set
   * ONESIGNAL_AUTH_SCHEME=Basic if the dashboard gave you a legacy key.
   */
  ONESIGNAL_AUTH_SCHEME: process.env.ONESIGNAL_AUTH_SCHEME || "Key",
};

/**
 * The business musafircars.com publishes.
 *
 * The public endpoints have no account and no token behind them, so the
 * business cannot come from the request, it has to be decided here, by
 * whoever runs the server. Unset means the public site is simply off and every
 * one of those routes answers 404: a rental site that lists the wrong cars is
 * worse than one that is down.
 *
 * Set it to the `_id` printed by `yarn seed:agency`.
 */
export const PUBLIC_AGENCY_ID = process.env.PUBLIC_AGENCY_ID || "";

// Locale defaults, the product is Pakistan-first
export const DEFAULT_CURRENCY = "PKR";
/**
 * What Musafir keeps from a booking on a car it does not own, as a percentage
 * of the rent. A starting value only: the office sets its own in settings, and
 * the figure is copied onto a booking when it is confirmed.
 */
export const DEFAULT_COMMISSION_PERCENT = 20;
export const TIMEZONE = "Asia/Karachi";
