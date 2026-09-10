import { Router } from "express";

import * as driverController from "@/controllers/driver-controller";
import {
  adminOnly,
  authMiddleware,
  requireAgencyScope,
} from "@/middlewares/auth-middleware";

const router = Router();

// The roster is the office's own list. Drivers have no account here.
router.use(authMiddleware, adminOnly, requireAgencyScope);

router.get("/", driverController.listDrivers);
router.post("/", driverController.createDriver);
router.get("/:id", driverController.getDriver);
router.patch("/:id", driverController.updateDriver);
router.delete("/:id", driverController.deleteDriver);

export default router;
