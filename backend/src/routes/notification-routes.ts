import { Router } from "express";

import * as notificationController from "@/controllers/notification-controller";
import { authMiddleware, requireAgencyScope } from "@/middlewares/auth-middleware";

const router = Router();

// Deliberately NOT adminOnly. A car owner is told things too, their listing
// approved, their payout sent, and the bell is the only place any of it can be
// read back once the push has been swiped away.
//
// `requireAgencyScope` still applies: every query below carries `owner` as a
// second gate behind the recipient id.
router.use(authMiddleware, requireAgencyScope);

router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.unreadCount);
router.post("/read", notificationController.markAllRead);
router.post("/:id/read", notificationController.markRead);

export default router;
