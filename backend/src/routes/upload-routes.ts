import { Router } from "express";

import * as fileController from "@/controllers/file-controller";
import * as uploadController from "@/controllers/upload-controller";
import { authMiddleware } from "@/middlewares/auth-middleware";
import { upload } from "@/middlewares/upload-middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", upload.single("file"), uploadController.uploadSingle);

// Reading a file needs an account too. Previously `express.static` served the
// whole uploads directory to anyone holding the URL, see file-controller.
router.get("/:filename", fileController.serveUpload);

export default router;
