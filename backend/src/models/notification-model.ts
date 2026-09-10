import mongoose, { Schema, Types } from "mongoose";

/**
 * One notification, as it was sent, kept so it can be read again.
 *
 * A push is a tap on the shoulder: it arrives once, on one device, and is gone
 * the moment it is swiped away or the browser was closed. Everything the
 * office is told this way, a booking request from the website, a car somebody
 * has offered, a rental due back today, is exactly the kind of thing you need
 * to find again an hour later.
 *
 * So the record is the point and the push is the delivery. It is written even
 * when push is switched off entirely (no OneSignal keys, nobody who granted
 * permission), because the bell has to work regardless of whether a vendor did.
 *
 * One row per RECIPIENT rather than per event: a listing approval tells the car
 * owner one thing and the office another, and both need to be readable and
 * markable as read on their own.
 */
export const NOTIFICATION_AUDIENCES = ["admin", "lender"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export interface NotificationDocument extends mongoose.Document<Types.ObjectId> {
  owner: Types.ObjectId;
  /** The account this copy belongs to, an `Admin` or a `Lender`. */
  recipient: Types.ObjectId;
  /**
   * Which collection `recipient` points at.
   *
   * Stored rather than resolved by lookup because the two id spaces are
   * separate and a bare id cannot say which one it came from, and because
   * every read filters on it anyway.
   */
  audience: NotificationAudience;
  title: string;
  body: string;
  /**
   * What the app needs to open the right screen: `type`, and whichever ids go
   * with it. The same object the push carries, so a notification opened from
   * the bell and one opened from the tray land in the same place.
   */
  data?: Record<string, unknown>;
  /** Absent until it has been read. Absent is what the unread count counts. */
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "Agency", required: true, index: true },
    recipient: { type: Schema.Types.ObjectId, required: true },
    audience: { type: String, enum: NOTIFICATION_AUDIENCES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    data: { type: Schema.Types.Mixed },
    readAt: { type: Date },
  },
  { timestamps: true },
);

/**
 * The only read this collection serves: one person's list, newest first.
 *
 * `readAt` is in the key so the unread COUNT, which every app launch asks for
 * and which is by far the most frequent query here, is answered from the index
 * without touching a document.
 */
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

/**
 * Notifications expire after 90 days.
 *
 * This is a log of things that already happened, and the bell is for the last
 * few days of them; nobody scrolls to March. Without a TTL it is an
 * append-only collection that only ever grows, every booking request, every
 * listing decision, every return due, for ever.
 */
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification = mongoose.model<NotificationDocument>(
  "Notification",
  notificationSchema,
);
