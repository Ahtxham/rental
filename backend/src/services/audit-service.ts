import { Request } from "express";

import { AdminDocument } from "@/models/admin-model";
import { AgencySnapshot } from "@/models/agency-model";
import { AuditLog } from "@/models/audit-log-model";

interface AuditInput {
  action: string;
  target?: Record<string, unknown>;
}

// Best-effort append to the audit trail. A logging failure must never fail the
// action being logged, so every error is swallowed after being reported.
export const recordAudit = async (req: Request, input: AuditInput): Promise<void> => {
  try {
    if (req.accountType !== "admin") return;
    const actor = req.user as AdminDocument | undefined;
    if (!actor) return;

    const agency = req.agency as AgencySnapshot | undefined;

    await AuditLog.create({
      actor: actor._id,
      actorName: actor.fullName ?? "",
      actorEmail: actor.email ?? "",
      action: input.action,
      agency: agency?._id ?? null,
      target: input.target,
      ip: req.ip,
    });
  } catch (error) {
    console.error("[audit] failed to record:", error instanceof Error ? error.message : error);
  }
};
