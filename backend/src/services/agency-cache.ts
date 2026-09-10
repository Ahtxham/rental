import Redis from "ioredis";

import { getRedisClient } from "@/config/redis";
import { Agency, AgencySnapshot } from "@/models/agency-model";

// `authMiddleware` resolves the caller's business on EVERY authenticated
// request. It changes rarely (a settings edit, a suspension), so hitting Mongo
// each time adds a round trip per request that scales with traffic, not data.
// This is a tiny read-through cache in front of that lookup.
//
// Staleness is bounded three ways:
//   1. every write path calls `invalidateAgency`, which clears this process;
//   2. that invalidation is broadcast over Redis, so OTHER instances (PM2
//      cluster workers, additional servers) drop their copy immediately too;
//   3. the TTL is the backstop for when Redis isn't configured or is down.
//
// Without (2), suspending would take effect instantly on whichever worker
// handled the request and up to a TTL later on all the others, which is
// exactly the window somebody would be logging in through.
const TTL_MS = 30_000;

const INVALIDATION_CHANNEL = "musafir:agency:invalidate";

interface Entry {
  agency: AgencySnapshot | null;
  expiresAt: number;
}

const cache = new Map<string, Entry>();

let subscriber: Redis | null = null;

/**
 * Start listening for other instances' invalidations. Called once at boot;
 * a no-op when Redis isn't configured (single-instance deployments rely on
 * local invalidation plus the TTL).
 */
export const initAgencyCacheSync = async (): Promise<void> => {
  const redis = getRedisClient();
  if (!redis || subscriber) return;

  try {
    // A subscribing connection can't issue normal commands, so it must be its
    // own client rather than the shared one.
    subscriber = redis.duplicate();
    subscriber.on("error", (error) =>
      console.error("[agency-cache] subscriber error:", error.message),
    );
    await subscriber.connect();
    await subscriber.subscribe(INVALIDATION_CHANNEL);
    subscriber.on("message", (channel, agencyId) => {
      if (channel === INVALIDATION_CHANNEL && agencyId) cache.delete(agencyId);
    });
    console.log("Agency cache invalidation syncing over Redis");
  } catch (error) {
    subscriber = null;
    console.warn(
      "[agency-cache] Redis sync unavailable, falling back to the TTL:",
      error instanceof Error ? error.message : error,
    );
  }
};

export const getAgencySnapshot = async (id: string): Promise<AgencySnapshot | null> => {
  const now = Date.now();
  const hit = cache.get(id);
  if (hit && hit.expiresAt > now) return hit.agency;

  const agency = (await Agency.findById(id).lean<AgencySnapshot>()) ?? null;
  cache.set(id, { agency, expiresAt: now + TTL_MS });
  return agency;
};

export const invalidateAgency = (id: string | { toString(): string }): void => {
  const key = id.toString();
  cache.delete(key);

  // Best-effort fan-out. A failed publish only costs the other instances a TTL
  // of staleness, so it must never fail the write that triggered it.
  const redis = getRedisClient();
  if (redis && redis.status === "ready") {
    redis.publish(INVALIDATION_CHANNEL, key).catch((error) => {
      console.error("[agency-cache] invalidation publish failed:", error.message);
    });
  }
};

export const clearAgencyCache = (): void => {
  cache.clear();
};
