import { Router } from "express";

import * as teamController from "@/controllers/team-controller";
import { adminOnly, authMiddleware, requireAgencyScope } from "@/middlewares/auth-middleware";

const router = Router();

router.use(authMiddleware, adminOnly, requireAgencyScope);

router.get("/", teamController.listTeam);
router.post("/", teamController.addTeamMember);
router.patch("/:adminId", teamController.updateTeamMember);
router.post("/:adminId/password", teamController.resetTeamMemberPassword);
router.delete("/:adminId", teamController.removeTeamMember);

export default router;
