import { Router } from "express";

import * as publicRentalController from "@/controllers/public-rental-controller";
import {
  publicBrowseRateLimiter,
  publicRequestRateLimiter,
} from "@/middlewares/security-middleware";

const router = Router();

/**
 * musafircars.com. Public, unauthenticated, and single-business by env, see
 * the controller. Nothing that needs an account belongs on this router.
 */
router.get("/config", publicBrowseRateLimiter, publicRentalController.publicConfig);
router.get("/cars", publicBrowseRateLimiter, publicRentalController.listPublicCars);
router.get("/cars/:id", publicBrowseRateLimiter, publicRentalController.getPublicCar);
// Photos of published cars only. See the controller: this is the one route that
// reads the uploads directory without an account, and it confirms a published
// car actually references the file before it serves a byte.
router.get("/photos/:filename", publicBrowseRateLimiter, publicRentalController.publicPhoto);
// A quote writes nothing, but it is a database read per keystroke if somebody
// wants it to be, so it carries the browse limiter rather than the request one.
router.post("/quote", publicBrowseRateLimiter, publicRentalController.quotePublicRental);
router.post("/requests", publicRequestRateLimiter, publicRentalController.createPublicRequest);

export default router;
