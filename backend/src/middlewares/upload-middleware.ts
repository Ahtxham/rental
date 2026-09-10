import crypto from "crypto";

import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic-byte signatures, validates *real* content type, not the client-supplied
// mimetype or extension.
const SIGNATURES: Array<{ ext: string; mime: string; bytes: number[]; offset?: number }> = [
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "webp", mime: "image/webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { ext: "pdf", mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

export const detectFileType = (buffer: Buffer): { ext: string; mime: string } | null => {
  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (buffer.length >= offset + sig.bytes.length) {
      const matches = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
      if (matches) return { ext: sig.ext, mime: sig.mime };
    }
  }
  return null;
};

/** Random, extension-safe filename, never derived from user input. */
export const safeFileName = (ext: string): string =>
  `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
});
