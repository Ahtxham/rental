import { Router } from "express";

import * as carController from "@/controllers/car-controller";
import {
  adminOnly,
  authMiddleware,
  requireAgencyScope,
} from "@/middlewares/auth-middleware";

const router = Router();

router.use(authMiddleware, adminOnly, requireAgencyScope);

router.get("/", carController.listCars);
router.post("/", carController.createCar);
router.get("/:id", carController.getCar);
router.patch("/:id", carController.updateCar);
router.delete("/:id", carController.deleteCar);

export default router;
