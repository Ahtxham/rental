import { Router } from "express";

import * as lenderController from "@/controllers/lender-controller";
import * as rentalController from "@/controllers/rental-controller";
import { adminOnly, authMiddleware, requireAgencyScope } from "@/middlewares/auth-middleware";

const router = Router();

// Bookings are an office job. Car owners see their own cars through
// /api/lenders/*; nothing on this router is theirs.
router.use(authMiddleware, adminOnly, requireAgencyScope);

// Static paths before "/:id" or they get captured by it.
router.get("/availability", rentalController.checkAvailability);

// Cars offered by owners outside the business, and the people who offered
// them. Static paths, so they sit above "/:id".
router.get("/listings", lenderController.listListings);
router.patch("/listings/:id", lenderController.reviewListing);
router.patch("/listings/:id/offer", lenderController.offerListing);
router.get("/lenders", lenderController.listLenders);
router.patch("/lenders/:id", lenderController.reviewLender);

// What is owed to those owners, and marking it sent.
router.get("/payouts", rentalController.listPayouts);

router.get("/", rentalController.listRentals);
router.post("/", rentalController.createRental);
router.get("/:id", rentalController.getRental);
router.patch("/:id", rentalController.updateRental);
router.post("/:id/confirm", rentalController.confirmRental);
router.post("/:id/handover", rentalController.handoverRental);
router.post("/:id/return", rentalController.returnRental);
router.post("/:id/cancel", rentalController.cancelRental);
router.post("/:id/payout", rentalController.settlePayout);

export default router;
