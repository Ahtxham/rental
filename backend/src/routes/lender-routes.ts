import { Router } from "express";

import * as lenderController from "@/controllers/lender-controller";
import { authMiddleware, lenderOnly } from "@/middlewares/auth-middleware";
import { authRateLimiter } from "@/middlewares/security-middleware";

const router = Router();

/**
 * The car owner's own area.
 *
 * Signing up and signing in are public and share the strict auth limiter,
 * they are the same kind of target as the fleet's own login. Everything below
 * belongs to one person: `lenderOnly` keeps staff out (they manage listings
 * through the audited tenant routes instead) and every controller filters by
 * the signed-in lender, because tenant scoping alone would let one car owner
 * read another's.
 */
router.post("/auth/signup", authRateLimiter, lenderController.signup);
router.post("/auth/login", authRateLimiter, lenderController.login);

router.use(authMiddleware, lenderOnly);

router.get("/me", lenderController.profile);
router.patch("/me", lenderController.updateProfile);
router.get("/cars", lenderController.listMyCars);
router.get("/earnings", lenderController.listMyEarnings);
router.post("/cars", lenderController.createMyCar);
router.patch("/cars/:id", lenderController.updateMyCar);
router.post("/cars/:id/offer", lenderController.respondToOffer);
router.delete("/cars/:id", lenderController.withdrawMyCar);

export default router;
