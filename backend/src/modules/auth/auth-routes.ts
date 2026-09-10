import { Router } from "express";
import { body } from "express-validator";

import { authMiddleware } from "@/middlewares/auth-middleware";
import { authRateLimiter, loginAccountRateLimiter } from "@/middlewares/security-middleware";
import { validateRequest } from "@/middlewares/validation-middleware";

import * as authController from "./auth-controller";

const router = Router();

// Auth endpoints are the ones worth brute-forcing, strict limiter on the whole router
router.use(authRateLimiter);

// Two layers: the router-wide per-IP limiter above, plus a per-account one so
// an attacker rotating IPs still can't grind a single account's password.
router.post(
  "/login",
  loginAccountRateLimiter,
  [
    body("email").isString().isEmail().withMessage("A valid email is required"),
    body("password").isString().isLength({ min: 1 }).withMessage("Password is required"),
  ],
  validateRequest,
  authController.login,
);

router.post("/logout", authController.logout);

router.post(
  "/forgot-password",
  [body("email").isString().isEmail().withMessage("A valid email is required")],
  validateRequest,
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  loginAccountRateLimiter,
  [
    body("email").isString().isEmail().withMessage("A valid email is required"),
    body("otp").isString().isLength({ min: 6, max: 6 }).withMessage("A 6-digit code is required"),
    body("newPassword")
      .isString()
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  validateRequest,
  authController.resetPassword,
);

router.get("/me", authMiddleware, authController.me);
router.patch("/me", authMiddleware, authController.updateMe);
// The browser reports notification permission state here. Carries no token.
router.post("/push-subscription", authMiddleware, authController.setPushSubscription);

export default router;
