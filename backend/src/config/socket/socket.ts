import http from "http";

import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";

import { getRedisClient } from "@/config/redis";
import { ALLOWED_ORIGINS } from "@/constants/env";
import { Admin } from "@/models/admin-model";
import { Agency } from "@/models/agency-model";
import { Lender } from "@/models/lender-model";
import { verifyToken } from "@/utils/jwt-helper";

const allowedOrigins = ALLOWED_ORIGINS
  ? ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:3100"];

/**
 * Rooms are namespaced by business, so a broadcast can never reach an account
 * outside it. Never create a global room.
 */
export const ownerRoom = (ownerId: string) => `owner:${ownerId}`;
/** One car owner's own feed, their listing was approved, their car was booked. */
export const lenderRoom = (lenderId: string) => `lender:${lenderId}`;

let io: Server;

export const initSocket = async (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  // Redis adapter when REDIS_URL is configured, enables multi-instance scaling
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.connect();
      const subClient = redis.duplicate();
      subClient.on("error", (err) => console.error("Redis sub-client error:", err.message));
      await subClient.connect();
      io.adapter(createAdapter(redis, subClient));
      console.log("Socket.IO using Redis adapter");
    } catch {
      console.warn("Redis unavailable. Socket.IO using in-memory adapter");
    }
  }

  io.on("connection", async (socket) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== "string") {
        socket.disconnect();
        return;
      }

      const decoded = verifyToken(token);
      // Recorded so `disconnectAccount` can hang this socket up if the
      // account's password is later changed.
      socket.data.accountId = decoded.id;

      // A token carries the account's `tokenVersion` at the moment it was
      // issued, and every password change bumps that version precisely so a
      // stolen session dies. `authMiddleware` compares it on every HTTP
      // request; the handshake must too, or a password reset locks a thief out
      // of the API while leaving them subscribed to the live feed.
      const versionMatches = (accountVersion: number | undefined) =>
        (decoded.tv ?? 0) === (accountVersion ?? 0);

      if (decoded.accountType === "admin") {
        const admin = await Admin.findOne({ _id: decoded.id, status: "active" })
          .select("agency tokenVersion")
          .lean();
        if (!admin?.agency || !versionMatches(admin.tokenVersion)) {
          socket.disconnect();
          return;
        }
        const agency = await Agency.findById(admin.agency).select("status").lean();
        if (!agency || agency.status !== "active") {
          socket.disconnect();
          return;
        }
        socket.join(ownerRoom(admin.agency.toString()));
      } else if (decoded.accountType === "lender") {
        const lender = await Lender.findById(decoded.id).select("owner status tokenVersion").lean();
        if (!lender || lender.status === "suspended" || !versionMatches(lender.tokenVersion)) {
          socket.disconnect();
          return;
        }
        const agency = await Agency.findById(lender.owner).select("status").lean();
        if (!agency || agency.status !== "active") {
          socket.disconnect();
          return;
        }
        // Their own room ONLY. A lender never joins the owner room, that
        // carries every booking and every customer's phone number.
        socket.join(lenderRoom(decoded.id));
      } else {
        socket.disconnect();
        return;
      }
    } catch {
      socket.disconnect();
    }
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
