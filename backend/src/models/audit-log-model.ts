import mongoose, { Schema, Types } from "mongoose";

export interface AuditLogDocument extends mongoose.Document<Types.ObjectId> {
  actor: Types.ObjectId;
  actorName: string;
  actorEmail: string;
  /** Dot-namespaced verb, e.g. "rental.confirmed", "listing.approved". */
  action: string;
  /** The business the action happened inside. */
  agency?: Types.ObjectId | null;
  /** Free-form target descriptor, e.g. { rentalId, customer }. */
  target?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Append-only trail of the things somebody will later argue about: who priced
 * a booking, who approved a stranger's car onto the website, who reset a
 * teammate's password. Written best-effort, an audit failure must never fail
 * the action it was recording.
 */
const auditLogSchema = new Schema<AuditLogDocument>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "Admin", required: true, index: true },
    actorName: { type: String, default: "" },
    actorEmail: { type: String, default: "" },
    action: { type: String, required: true, index: true },
    agency: { type: Schema.Types.ObjectId, ref: "Agency", default: null, index: true },
    target: { type: Schema.Types.Mixed },
    ip: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ agency: 1, createdAt: -1 });

export const AuditLog = mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
