import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import cron from "node-cron";

import { getS3Client, isS3Configured } from "@/config/s3";
import { BACKUP, DB_URI } from "@/constants/env";

const execFileAsync = promisify(execFile);

/**
 * In-process daily database backup: whenever the backend is running, a cron
 * schedule (default 00:00 America/Chicago) dumps MongoDB with `mongodump`,
 * uploads it to s3://<bucket>/backups/musafir/<YYYY-MM-DD_HH-MM-SS>.archive.gz
 * and prunes everything beyond the newest 30. No system crontab needed,
 * the schedule lives and dies with the server process.
 */

const log = (message: string) => console.log(`[db-backup] ${message}`);

const timestamp = (): string => {
  // en-CA + hour24 → "2026-07-20, 00:00:00" pieces in the schedule's timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BACKUP.TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}-${get("minute")}-${get("second")}`;
};

const pruneOldBackups = async (): Promise<void> => {
  const s3 = getS3Client();
  const prefix = `${BACKUP.PREFIX}/`;
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: BACKUP.BUCKET, Prefix: prefix }),
  );
  const keys = (listed.Contents ?? [])
    .map((obj) => obj.Key ?? "")
    .filter((key) => key.endsWith(".archive.gz"))
    .sort(); // timestamped names sort oldest-first

  const excess = keys.length - BACKUP.KEEP;
  if (excess <= 0) {
    log(`Retention: ${keys.length} backup(s), nothing to prune (keeping up to ${BACKUP.KEEP})`);
    return;
  }
  const doomed = keys.slice(0, excess);
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: BACKUP.BUCKET,
      Delete: { Objects: doomed.map((Key) => ({ Key })), Quiet: true },
    }),
  );
  log(`Retention: pruned ${doomed.length} old backup(s), ${BACKUP.KEEP} kept`);
};

let running = false;

export const runDatabaseBackup = async (): Promise<void> => {
  if (running) {
    log("Skipped, a backup is already in progress");
    return;
  }
  if (!BACKUP.BUCKET || !isS3Configured()) {
    log("Skipped. S3 is not configured (set AWS_* / BACKUP_S3_BUCKET in .env)");
    return;
  }

  running = true;
  const name = `${timestamp()}.archive.gz`;
  const localFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "musafir-backup-")), name);
  try {
    log(`Dumping database → ${name}`);
    await execFileAsync(
      "mongodump",
      [`--uri=${DB_URI}`, `--archive=${localFile}`, "--gzip", "--quiet"],
      { maxBuffer: 16 * 1024 * 1024 },
    );

    const { size } = fs.statSync(localFile);
    const key = `${BACKUP.PREFIX}/${name}`;
    log(`Uploading ${(size / 1024 / 1024).toFixed(2)} MB → s3://${BACKUP.BUCKET}/${key}`);
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: BACKUP.BUCKET,
        Key: key,
        Body: fs.createReadStream(localFile),
        ContentLength: size,
        ContentType: "application/gzip",
      }),
    );

    await pruneOldBackups();
    log("Backup complete");
  } catch (error) {
    // A failed backup must never take the API down, log loudly and move on
    console.error("[db-backup] FAILED:", error instanceof Error ? error.message : error);
  } finally {
    running = false;
    fs.rmSync(path.dirname(localFile), { recursive: true, force: true });
  }
};

export const startBackupScheduler = (): void => {
  if (!BACKUP.BUCKET || !isS3Configured()) {
    log("Scheduler disabled, no S3 bucket configured");
    return;
  }
  if (!cron.validate(BACKUP.CRON)) {
    console.error(`[db-backup] Invalid BACKUP_CRON expression: "${BACKUP.CRON}", scheduler disabled`);
    return;
  }
  cron.schedule(BACKUP.CRON, runDatabaseBackup, { timezone: BACKUP.TZ, noOverlap: true });
  log(`Scheduled "${BACKUP.CRON}" (${BACKUP.TZ}) → s3://${BACKUP.BUCKET}/${BACKUP.PREFIX}/ (keep ${BACKUP.KEEP})`);
};
