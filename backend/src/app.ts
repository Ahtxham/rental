import path from "path";

import compression from "compression";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { ALLOWED_ORIGINS, MODE } from "@/constants/env";
import { errorMiddleware } from "@/middlewares";
import { globalApiRateLimiter, mongoSanitize } from "@/middlewares/security-middleware";

import { routes } from "./routes";

const app: Application = express();

const allowedOrigins = ALLOWED_ORIGINS
  ? ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:3001"];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Trust proxy (required when behind a reverse proxy like Nginx)
app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));

if (MODE !== "production") {
  app.use(morgan("dev"));
}

// Security: throttle abusive traffic and neutralise NoSQL operator-injection
// payloads before they reach any controller/Mongoose query.
app.use(globalApiRateLimiter);
app.use(mongoSanitize);

// In production, strip internal `error` payloads from JSON responses
// (Mongoose/stack details) to prevent info disclosure.
if (MODE === "production") {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (body && typeof body === "object" && "error" in (body as Record<string, unknown>)) {
        const safe = { ...(body as Record<string, unknown>) };
        delete safe.error;
        return originalJson(safe);
      }
      return originalJson(body);
    };
    next();
  });
}

// Uploaded files are NOT served statically. They are driver identity documents,
// receipts and handover photos, and `express.static` sat outside every guard:
// uploading needed a token, reading needed nothing at all. They now go through
// GET /api/uploads/:filename behind authMiddleware. This redirect keeps URLs
// already written into the database resolving.
app.use("/uploads/:filename", (req, res) => {
  res.redirect(308, `/api/uploads/${req.params.filename}`);
});

// Routes
app.use("/", routes);

// Error Handling
app.use(errorMiddleware.notFound);
app.use(errorMiddleware.internalServerError);

export default app;
