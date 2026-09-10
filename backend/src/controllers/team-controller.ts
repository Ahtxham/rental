import { Request, Response } from "express";

import { statusCodes } from "@/constants/statusCodes";
import { Admin, AdminDocument } from "@/models/admin-model";
import { recordAudit } from "@/services/audit-service";
import { disconnectAccount } from "@/services/socket-service";
import { catchAsync } from "@/utils/catch-async";
import { hashPassword } from "@/utils/password-helper";

// The people who work in the office. Everything here is scoped to
// `req.ownerId`, and the founding account is protected from its own teammates.

const loadTeammate = async (req: Request, res: Response): Promise<AdminDocument | null> => {
  const admin = await Admin.findOne({
    _id: req.params.adminId,
    agency: req.ownerId,
  });
  if (!admin) {
    res.status(statusCodes.NOT_FOUND).json({ message: "Admin not found." });
    return null;
  }
  return admin;
};

const isSelf = (req: Request, admin: AdminDocument) =>
  req.accountType === "admin" && req.user!._id.toString() === admin._id.toString();

// The founding account is protected from its own teammates. Only the owner
// themselves can change it, through Settings.
const protectedOwner = (req: Request, admin: AdminDocument) =>
  admin.isAgencyOwner && !isSelf(req, admin);

// GET /api/team
export const listTeam = catchAsync(async (req: Request, res: Response) => {
  const admins = await Admin.find({ agency: req.ownerId }).sort({
    isAgencyOwner: -1,
    createdAt: 1,
  });
  res.json({ data: admins.map((a) => a.toJSON()) });
});

// POST /api/team
export const addTeamMember = catchAsync(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!email.includes("@") || !fullName) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Name and a valid email are required." });
    return;
  }
  if (password.length < 8) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Password must be at least 8 characters." });
    return;
  }
  if (await Admin.findOne({ email }).select("_id")) {
    res
      .status(statusCodes.CONFLICT)
      .json({ message: "An account with that email already exists." });
    return;
  }

  const admin = await Admin.create({
    email,
    password: await hashPassword(password),
    fullName,
    phone: phone || "-",
    agency: req.ownerId,
  });

  await recordAudit(req, {
    action: "team.member-added",
    target: { adminId: admin._id.toString(), email },
  });

  res.status(statusCodes.CREATED).json({ data: admin.toJSON(), message: "Team member added." });
});

// PATCH /api/team/:adminId
export const updateTeamMember = catchAsync(async (req: Request, res: Response) => {
  const admin = await loadTeammate(req, res);
  if (!admin) return;

  if (protectedOwner(req, admin)) {
    res
      .status(statusCodes.FORBIDDEN)
      .json({ message: "The owner's account can't be changed by another admin." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  for (const key of ["fullName", "phone"] as const) {
    if (typeof body[key] === "string") {
      (admin as unknown as Record<string, unknown>)[key] = body[key];
    }
  }

  if (body.status === "active" || body.status === "suspended") {
    if (isSelf(req, admin) && body.status === "suspended") {
      res.status(statusCodes.UNPROCESSABLE_ENTITY).json({ message: "You can't suspend yourself." });
      return;
    }
    admin.status = body.status;
  }

  await admin.save();
  await recordAudit(req, {
    action: "team.member-updated",
    target: { adminId: admin._id.toString(), email: admin.email, status: admin.status },
  });

  res.json({ data: admin.toJSON(), message: "Team member updated." });
});

// POST /api/team/:adminId/password
export const resetTeamMemberPassword = catchAsync(async (req: Request, res: Response) => {
  const password = (req.body ?? {}).password;
  if (typeof password !== "string" || password.length < 8) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "Password must be at least 8 characters." });
    return;
  }

  const admin = await loadTeammate(req, res);
  if (!admin) return;

  if (protectedOwner(req, admin)) {
    res
      .status(statusCodes.FORBIDDEN)
      .json({ message: "The owner's password can't be reset by another admin." });
    return;
  }

  admin.password = await hashPassword(password);
  admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
  disconnectAccount(admin._id.toString());
  await admin.save();
  await recordAudit(req, {
    action: "team.password-reset",
    target: { adminId: admin._id.toString(), email: admin.email },
  });

  res.json({ message: "Password updated." });
});

// DELETE /api/team/:adminId
export const removeTeamMember = catchAsync(async (req: Request, res: Response) => {
  const admin = await loadTeammate(req, res);
  if (!admin) return;

  if (isSelf(req, admin)) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "You can't remove your own account." });
    return;
  }
  if (protectedOwner(req, admin)) {
    res
      .status(statusCodes.FORBIDDEN)
      .json({ message: "The owner's account can't be removed by another admin." });
    return;
  }

  const remaining = await Admin.countDocuments({ agency: req.ownerId, _id: { $ne: admin._id } });
  if (remaining === 0) {
    res
      .status(statusCodes.UNPROCESSABLE_ENTITY)
      .json({ message: "This is the only account left, add another before removing this one." });
    return;
  }

  await Admin.deleteOne({ _id: admin._id });
  await recordAudit(req, {
    action: "team.member-removed",
    target: { adminId: admin._id.toString(), email: admin.email },
  });

  res.json({ message: "Team member removed." });
});
