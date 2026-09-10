import { startBackupScheduler } from "./db-backup-job";

export * from "./db-backup-job";

/**
 * Every recurring job lives in this folder, one file per job. Called once at
 * boot (src/index.ts); each job no-ops safely when its prerequisites (an S3
 * bucket, say) are missing.
 */
export const startJobs = (): void => {
  // Daily DB backup → S3 (cron inside this process, default midnight PKT)
  startBackupScheduler();
};
