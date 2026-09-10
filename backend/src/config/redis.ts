import Redis from "ioredis";

import { REDIS_URL } from "@/constants/env";
import { LOGUI } from "@/constants/logs";

let client: Redis | null = null;

// Lazily create a single shared Redis client. Returns null when REDIS_URL is
// unset, callers must degrade gracefully (in-memory rate limiting, default
// Socket.IO adapter).
export const getRedisClient = (): Redis | null => {
  if (!REDIS_URL) return null;
  if (!client) {
    client = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    client.on("error", (err) => console.error(LOGUI.FgRed, `Redis error: ${err.message}`));
    client.on("ready", () => console.log(LOGUI.FgGreen, "Redis connected"));
  }
  return client;
};
