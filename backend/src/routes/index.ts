import { Router } from "express";

import { authRoutes } from "@/modules/auth";

import carRoutes from "./car-routes";
import driverRoutes from "./driver-routes";
import lenderRoutes from "./lender-routes";
import notificationRoutes from "./notification-routes";
import publicRentalRoutes from "./public-rental-routes";
import rentalRoutes from "./rental-routes";
import teamRoutes from "./team-routes";
import uploadRoutes from "./upload-routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "musafir-backend" });
});

router.use("/api/auth", authRoutes);

// musafircars.com, public, unauthenticated, and pinned to one business by
// env. Mounted under /api/public/* so nothing here can ever be mistaken for a
// scoped route by somebody adding a sibling.
router.use("/api/public/rentals", publicRentalRoutes);

// Car owners from outside the business, see lender-routes.
router.use("/api/lenders", lenderRoutes);

// The office. Every router below carries `requireAgencyScope`, which refuses
// any request that reached it without a resolved `ownerId` (Mongoose drops
// undefined filter keys, so an unscoped query would read every row).
router.use("/api/rentals", rentalRoutes);
router.use("/api/cars", carRoutes);
router.use("/api/drivers", driverRoutes);
router.use("/api/notifications", notificationRoutes);
router.use("/api/team", teamRoutes);
router.use("/api/uploads", uploadRoutes);

export { router as routes };
