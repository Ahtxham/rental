import { Request, Response } from "express";
import { Types } from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { Notification } from "@/models/notification-model";
import { catchAsync } from "@/utils/catch-async";

/**
 * Reading back what somebody was told.
 *
 * The write side lives in `services/notification-service.ts`, which files a row
 * per recipient as each event fires. This is the other half: the bell.
 *
 * **Scoping here is by recipient, not by business.** Every other controller
 * filters on `owner` because the question is "what belongs to this business";
 * the question here is "what was *I* told", and two people in the same office
 * have different answers, one may have read a thing the other has not.
 * `owner` is still in the filter as a second gate, so a row can never be read
 * across a boundary even if an id were somehow reused.
 */

/** The caller's own id, as stored in `recipient`. */
const recipientOf = (req: Request): Types.ObjectId | undefined =>
  req.user?._id as Types.ObjectId | undefined;

/**
 * GET /api/notifications, this account's notifications, newest first.
 *
 * `unread` rides along with the page rather than needing a second call: the
 * screen that shows the list is also the screen that clears the badge, and
 * having one response carry both means the two can never disagree on the way
 * in.
 */
export const listNotifications = catchAsync(async (req: Request, res: Response) => {
  const recipient = recipientOf(req);
  if (!recipient) {
    res.json({ data: [], total: 0, page: 1, pages: 0, unread: 0 });
    return;
  }

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit || "30"), 10) || 30),
  );

  const filter = { recipient, owner: req.ownerId };

  const [data, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: { $exists: false } }),
  ]);

  res.json({ data, total, page, pages: Math.ceil(total / limit), unread });
});

/**
 * GET /api/notifications/unread-count, just the number on the badge.
 *
 * Its own endpoint because the home screen asks on every focus and does not
 * want the rows: this is answered out of the `(recipient, readAt, createdAt)`
 * index without touching a document, which the full list is not.
 */
export const unreadCount = catchAsync(async (req: Request, res: Response) => {
  const recipient = recipientOf(req);
  if (!recipient) {
    res.json({ data: { count: 0 } });
    return;
  }

  const count = await Notification.countDocuments({
    recipient,
    owner: req.ownerId,
    readAt: { $exists: false },
  });

  res.json({ data: { count } });
});

/**
 * POST /api/notifications/read, mark everything read.
 *
 * What opening the bell does. Marking each row as it scrolls past would be
 * more precise and much worse: the badge would drain a few at a time and an
 * admin who glanced at the list would come back to a number that had not
 * moved.
 *
 * `readAt` is only set where it is missing, so re-opening the list does not
 * rewrite the timestamps of things read last week.
 */
export const markAllRead = catchAsync(async (req: Request, res: Response) => {
  const recipient = recipientOf(req);
  if (!recipient) {
    res.json({ data: { updated: 0 } });
    return;
  }

  const result = await Notification.updateMany(
    { recipient, owner: req.ownerId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  );

  res.json({ data: { updated: result.modifiedCount ?? 0 } });
});

/**
 * POST /api/notifications/:id/read, mark one read.
 *
 * For the tap that opens a notification's subject: the row is read even though
 * the list was never opened, which is what a push tap does.
 */
export const markRead = catchAsync(async (req: Request, res: Response) => {
  const recipient = recipientOf(req);
  // Express 5 types a param as `string | string[]`, a repeated key arrives as
  // an array, and `isValid` would throw on one.
  const id = String(req.params.id ?? "");

  if (!Types.ObjectId.isValid(id)) {
    res.status(statusCodes.BAD_REQUEST).json({ message: "A valid notification is required." });
    return;
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient, owner: req.ownerId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  ).lean();

  // A row that was already read is not an error, two taps on the same card,
  // or a push tap followed by opening the list, both land here.
  if (!notification) {
    const exists = await Notification.exists({ _id: id, recipient, owner: req.ownerId });
    if (!exists) {
      res.status(statusCodes.NOT_FOUND).json({ message: "Notification not found." });
      return;
    }
  }

  res.json({ data: notification ?? null });
});
