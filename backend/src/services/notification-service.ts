import { Types } from "mongoose";

import { Admin } from "@/models/admin-model";
import { Lender } from "@/models/lender-model";
import { Notification, type NotificationAudience } from "@/models/notification-model";

import { isConfigured, sendToExternalIds, type PushMessage } from "./providers/onesignal";

/**
 * The app's notification surface.
 *
 * Callers say `notifyAgencyAdmins` or `notifyLender`, they never learn which
 * provider is behind it. That indirection is not ceremony: push vendors are the
 * part of a stack most likely to be swapped, and the alternative is hunting
 * vendor calls through a dozen controllers.
 *
 * Every function here is **best-effort and never throws**. A notification
 * describes something that has already happened; failing a booking because a
 * push timed out would be absurd.
 */

export type { PushMessage };

/** Per-call switches. Only one so far, and it is about the record, not the push. */
export interface NotifyOptions {
  /** Keep a copy in the notifications table, so the bell can show it. Default true. */
  store?: boolean;
}

/**
 * An account's OneSignal external id is simply its `_id`.
 *
 * Using an id we already own, rather than storing device tokens, means
 * somebody who reinstalls, switches phone, or is signed in on two devices stays
 * reachable with no token table to keep in sync.
 */
const externalIdFor = (accountId: Types.ObjectId | string): string => accountId.toString();

export const isPushConfigured = (): boolean => isConfigured();

/**
 * Keep a copy of what was sent, so the bell can show it again.
 *
 * Written BEFORE the push is attempted, and independently of whether push is
 * configured at all. The record is the durable half: a push is one tap on one
 * device and is gone when it is swiped, whereas "what was I told this week" is
 * a question somebody asks with the phone in their hand.
 */
const record = async (
  ownerId: Types.ObjectId | string | undefined,
  recipients: Array<Types.ObjectId | string>,
  audience: NotificationAudience,
  message: PushMessage,
): Promise<void> => {
  // Without an owner there is nothing to scope the read by, so the row would be
  // unreachable. Better to send and not store than to store an orphan.
  if (!ownerId || recipients.length === 0) return;
  try {
    await Notification.insertMany(
      recipients.map((recipient) => ({
        owner: ownerId,
        recipient,
        audience,
        title: message.title,
        body: message.body,
        data: message.data,
      })),
      { ordered: false },
    );
  } catch (error) {
    console.warn(
      `[notify] could not store notification, ${error instanceof Error ? error.message : error}`,
    );
  }
};

/**
 * Reach everybody in the office.
 *
 * Every active admin, including ones who have never allowed notifications,
 * OneSignal simply matches nobody for those, and filtering on
 * `pushSubscribedAt` here would silently drop somebody whose browser
 * re-registered before the field was stamped. They all get the stored copy
 * regardless: the bell is where most of this is actually read.
 */
export const notifyAgencyAdmins = async (
  agencyId: Types.ObjectId | string,
  message: PushMessage,
  options: NotifyOptions = {},
): Promise<boolean> => {
  const admins = await Admin.find({ agency: agencyId, status: "active" }).select("_id").lean();
  if (admins.length === 0) return false;

  if (options.store !== false) {
    await record(
      agencyId,
      admins.map((admin) => admin._id),
      "admin",
      message,
    );
  }

  if (!isConfigured()) return false;

  const result = await sendToExternalIds(admins.map((admin) => externalIdFor(admin._id)), message);

  if (result.ok) {
    await Admin.updateMany(
      { _id: { $in: admins.map((a) => a._id) } },
      { $set: { pushLastNotifiedAt: new Date() } },
    ).catch(() => undefined);
    return true;
  }

  console.warn(`[push] office not notified, ${result.reason}`);
  return false;
};

/**
 * Tell one car owner something about their own car.
 *
 * The message must be about THEIR car and nothing else, a lender is a member
 * of the public, and a push lands in an OS notification log. No customer names,
 * no phone numbers, no registration numbers.
 */
export const notifyLender = async (
  lenderId: Types.ObjectId | string,
  message: PushMessage,
  options: NotifyOptions = {},
): Promise<boolean> => {
  if (options.store !== false) {
    const lender = await Lender.findById(lenderId).select("owner").lean();
    await record(lender?.owner, [lenderId], "lender", message);
  }

  if (!isConfigured()) return false;

  const result = await sendToExternalIds([externalIdFor(lenderId)], message);
  if (!result.ok) {
    // Id only: a log line naming the person would put personal data in a file
    // that gets shipped off the box.
    console.warn(`[push] lender ${lenderId} not notified, ${result.reason}`);
  }
  return result.ok;
};
