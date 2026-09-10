import fs from "fs";
import path from "path";

import { Request, Response } from "express";

import { UPLOADS_DIR } from "@/config/s3";
import { statusCodes } from "@/constants/statusCodes";
import { catchAsync } from "@/utils/catch-async";

/**
 * Serve an uploaded file to a signed-in account.
 *
 * These files were previously handed to `express.static`, which sits outside
 * every guard: uploading needed a token, reading needed nothing at all. What
 * goes through here is a driver's CNIC front and back, their driving licence, a
 * selfie, maintenance receipts and the odometer and fuel photos taken at
 * handover, and a URL, once it exists, leaks through API responses, server
 * logs, referrer headers and browser history, never expires, and keeps working
 * for anyone who ever held it.
 *
 * Requiring a token does not make the link secret, but it does mean access ends
 * when the account does, which is the property that was missing.
 *
 * Deliberately NOT tenant-scoped: the filename carries no owner, and the
 * records that reference it are spread across drivers, maintenance and shifts.
 * Scoping properly means resolving the referencing document, which is the right
 * next step, see the note in CLAUDE.md, but "any signed-in account" is
 * already a far smaller audience than "the internet".
 */

// Exactly what `safeFileName` produces: millis, a dash, 16 hex characters, and
// an extension. Anything else is not one of ours, and pattern-matching the
// whole name is what makes path traversal impossible rather than a filter to
// be outwitted.
const SAFE_NAME = /^\d{10,}-[a-f0-9]{16}\.[a-z0-9]{2,5}$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Stream one locally-stored upload, or answer false if there is nothing to
 * stream. Every caller goes through here rather than joining a path of its
 * own: the two checks below are what make a filename from anywhere safe, and
 * a second copy of them is a second chance to get one wrong.
 *
 * Callers decide WHO may read the file; this decides only what a filename is
 * allowed to reach.
 */
export const streamUpload = (
  res: Response,
  name: unknown,
  /**
   * How the answer may be cached. Defaults to private, because almost
   * everything in this directory is somebody's identity document.
   *
   * A parameter rather than something the caller sets before or after: setting
   * it outside would be silently overwritten by the header below, and setting
   * it after would depend on nobody ever adding an early return in between.
   */
  cacheControl = "private, max-age=300",
): boolean => {
  if (typeof name !== "string" || !SAFE_NAME.test(name)) return false;

  const filePath = path.join(UPLOADS_DIR, name);
  // Belt and braces behind the pattern: resolve and confirm the result is still
  // inside the uploads directory.
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) return false;
  if (!fs.existsSync(filePath)) return false;

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  res.setHeader("Content-Type", CONTENT_TYPES[ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", cacheControl);
  // The file is displayed, never executed, this closes the door on an upload
  // that survived type-sniffing being served as script.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `inline; filename="${name}"`);

  fs.createReadStream(filePath).pipe(res);
  return true;
};

/** The filename inside a stored upload URL, whichever shape it was written in. */
export const uploadFileName = (url: string): string | null => {
  const name = url.split("?")[0].split("/").pop();
  return name && SAFE_NAME.test(name) ? name : null;
};

export const serveUpload = catchAsync(async (req: Request, res: Response) => {
  if (!streamUpload(res, req.params.filename)) {
    res.status(statusCodes.NOT_FOUND).json({ message: "File not found." });
  }
});
