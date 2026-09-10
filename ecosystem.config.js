/**
 * PM2 deployment config, runs the API and the website as two managed
 * processes.
 *
 * Ports are NOT hardcoded here: they're read from each project's .env,
 * backend/.env PORT (API) and rentals-web/.env PORT (Next). The app names carry
 * the port (musafir-BE-<port> / musafir-FE-<port>) following the server's
 * naming convention.
 *
 *   # one-time build
 *   cd backend      && yarn install --frozen-lockfile && yarn build
 *   cd ../rentals-web && npm ci && npm run build
 *
 *   # start / manage
 *   pm2 start ecosystem.config.js
 *   pm2 restart musafir-BE-5012
 *   pm2 logs musafir-FE-8100
 *   pm2 save && pm2 startup     # survive server reboots
 *
 * Backend env comes from backend/.env (dotenv), set JWT_SECRET, DB_URI,
 * MODE=production and PUBLIC_AGENCY_ID there. Without PUBLIC_AGENCY_ID the
 * public site answers 404 for every car; see backend/src/constants/env.ts.
 */
const fs = require("fs");
const path = require("path");

const readEnv = (file) => {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(__dirname, file), "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !line.trim().startsWith("#")) env[match[1]] = match[2].trim();
    }
  } catch {
    // missing .env, fall back to the defaults below
  }
  return env;
};

const backendEnv = readEnv("backend/.env");
const webEnv = readEnv("rentals-web/.env");

const BE_PORT = Number(backendEnv.PORT) || 5012;
const FE_PORT = Number(webEnv.PORT) || 8100;
const API_URL = webEnv.API_URL || `http://127.0.0.1:${BE_PORT}`;

module.exports = {
  apps: [
    {
      name: `musafir-BE-${BE_PORT}`,
      cwd: "./backend",
      script: "dist/index.js",
      instances: 1, // scale beyond 1 only with REDIS_URL set (Socket.IO adapter)
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        MODE: "production",
        PORT: BE_PORT,
      },
      out_file: "./logs/backend-out.log",
      error_file: "./logs/backend-error.log",
      merge_logs: true,
      time: true,
    },
    {
      name: `musafir-FE-${FE_PORT}`,
      cwd: "./rentals-web",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${FE_PORT}`,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        // The website's own /api/* route handlers call through to here. The
        // browser never sees this address.
        API_URL,
      },
      out_file: "./logs/web-out.log",
      error_file: "./logs/web-error.log",
      merge_logs: true,
      time: true,
    },
    // DB backups need no PM2 app and no system crontab: the backend schedules
    // them in-process (jobs/db-backup-job.ts, BACKUP_* in backend/.env).
    // Note the trade-off, the schedule lives and dies with this process, so a
    // backend that is down at BACKUP_CRON simply skips that day.
  ],
};
