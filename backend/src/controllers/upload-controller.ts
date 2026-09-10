import { Request, Response } from "express";

import { deleteFile, uploadFile } from "@/config/s3";
import { statusCodes } from "@/constants/statusCodes";
import { detectFileType, safeFileName } from "@/middlewares/upload-middleware";
import { catchAsync } from "@/utils/catch-async";

/**
 * POST /api/uploads, single file (field: "file").
 *
 * Validates the real content type via magic bytes, generates a safe random
 * filename, and stores to S3 or local disk.
 *
 * An optional `replaces` field carries the URL this upload supersedes, the
 * photo that was in the box before. It is removed only AFTER the new file is
 * safely stored, so a failed upload never costs the picture it was meant to
 * replace, and only ever if it is a file this app itself wrote (see
 * `ownedFileName`).
 *
 * The client is trusted to send `replaces` only for a URL that nothing has
 * saved yet. That is a real constraint rather than a detail: a photo already
 * recorded against a booking is evidence, and deleting it because
 * somebody opened a form and changed their mind would destroy a record while
 * leaving the reference to it in place.
 */
export const uploadSingle = catchAsync(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(statusCodes.BAD_REQUEST).json({ message: "No file uploaded." });
    return;
  }

  const detected = detectFileType(file.buffer);
  if (!detected) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Only JPEG, PNG, WebP images or PDF files are allowed." });
    return;
  }

  const fileName = safeFileName(detected.ext);
  const url = await uploadFile(file.buffer, fileName, detected.mime);

  // After the new file is stored, never before. `deleteFile` is best-effort
  // and silent on anything it does not recognise as ours.
  const replaces = (req.body as { replaces?: unknown } | undefined)?.replaces;
  let replaced = false;
  if (typeof replaces === "string" && replaces && replaces !== url) {
    replaced = await deleteFile(replaces);
  }

  res.status(statusCodes.CREATED).json({
    data: { url, replaced },
    message: "File uploaded.",
  });
});
