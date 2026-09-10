import { getIO, lenderRoom, ownerRoom } from "@/config/socket";

// Fire-and-forget emit helpers. Swallowing "io not initialized" lets REST
// handlers and scripts (e.g. the seeder) run without a live socket server.

export const emitToOwner = (ownerId: string, event: string, payload: unknown): void => {
  try {
    getIO().to(ownerRoom(ownerId)).emit(event, payload);
  } catch {
    // socket server not running. REST behaviour is unaffected
  }
};

export const emitToLender = (lenderId: string, event: string, payload: unknown): void => {
  try {
    getIO().to(lenderRoom(lenderId)).emit(event, payload);
  } catch {
    // socket server not running
  }
};

/**
 * Hang up every socket belonging to one account.
 *
 * The handshake refuses a token whose `tokenVersion` is stale, but that only
 * bites when a client next connects. A socket opened before the reset stays
 * up, it was authenticated once and never asked again, so a stolen session
 * would keep receiving bookings for as long as it held the connection.
 *
 * Called wherever `tokenVersion` is bumped. Best-effort like the emit helpers:
 * a password change must never fail because the socket server is down.
 */
export const disconnectAccount = (accountId: string): void => {
  try {
    for (const socket of getIO().sockets.sockets.values()) {
      if ((socket.data as { accountId?: string } | undefined)?.accountId === accountId) {
        socket.disconnect(true);
      }
    }
  } catch {
    // socket server not running, nothing to hang up
  }
};
