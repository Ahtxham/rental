import fs from "fs";
import path from "path";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { AWS } from "@/constants/env";

export const isS3Configured = () => !!(AWS.ACCESSKEYID && AWS.SECRETACCESSKEY && AWS.BUCKET_NAME);

let s3Client: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: AWS.REGION,
      credentials: {
        accessKeyId: AWS.ACCESSKEYID,
        secretAccessKey: AWS.SECRETACCESSKEY,
      },
    });
  }
  return s3Client;
};

// Exported so the authenticated file route reads from the same place the
// upload wrote to.
export const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Uploads a buffer to S3 when configured, otherwise persists to the local
// uploads/ directory (served statically at /uploads). Returns the public URL.
export const uploadFile = async (
  buffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> => {
  if (isS3Configured()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: AWS.BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `https://${AWS.BUCKET_NAME}.s3.${AWS.REGION}.amazonaws.com/${fileName}`;
  }

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer);
  return `/uploads/${fileName}`;
};

/**
 * Filenames this app generates: a timestamp, a random hex, a known extension.
 *
 * Every delete is checked against it. A key is the only thing standing between
 * a "replace this photo" request and any other object in the bucket, and the
 * client supplies it, so nothing that does not look like something we wrote
 * is ever passed to S3.
 */
const OWN_FILE = /^\d{10,}-[0-9a-f]{16}\.(jpg|png|webp|pdf)$/;

/**
 * The stored filename inside a URL we handed out, or null for anything else.
 *
 * Deliberately strict. It accepts the two shapes this app produces, a local
 * `/uploads/x.jpg` path and an S3 object URL in our own bucket, and rejects
 * everything else, including a URL pointing at another bucket, a key with a
 * path in it, or one that traverses upwards.
 */
export const ownedFileName = (url: string): string | null => {
  if (typeof url !== "string" || !url) return null;

  let name: string | null = null;

  if (url.startsWith("/uploads/")) {
    name = url.slice("/uploads/".length);
  } else if (isS3Configured()) {
    const expected = `https://${AWS.BUCKET_NAME}.s3.${AWS.REGION}.amazonaws.com/`;
    if (url.startsWith(expected)) name = url.slice(expected.length);
  }

  if (!name) return null;
  // No directories, no traversal, the pattern below would reject them anyway,
  // but saying so here is what makes that non-accidental.
  if (name.includes("/") || name.includes("..")) return null;
  return OWN_FILE.test(name) ? name : null;
};

/**
 * Remove a file this app previously stored. Best-effort by design.
 *
 * Called when a photo is replaced, where the old object has just become
 * unreferenced. A failure here is a wasted object in a bucket, which is worth
 * far less than the upload that has already succeeded, so it never throws
 * and never fails the request that triggered it.
 */
export const deleteFile = async (url: string): Promise<boolean> => {
  const fileName = ownedFileName(url);
  if (!fileName) return false;

  try {
    if (isS3Configured()) {
      await getS3Client().send(
        new DeleteObjectCommand({ Bucket: AWS.BUCKET_NAME, Key: fileName }),
      );
      return true;
    }
    const target = path.join(UPLOADS_DIR, fileName);
    // Re-checked against the resolved directory: the pattern above already
    // forbids traversal, but a delete is worth belt and braces.
    if (!target.startsWith(UPLOADS_DIR)) return false;
    await fs.promises.unlink(target).catch(() => undefined);
    return true;
  } catch (error) {
    console.error("[uploads] could not remove", fileName, error instanceof Error ? error.message : error);
    return false;
  }
};
