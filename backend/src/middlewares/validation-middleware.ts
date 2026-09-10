import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

import { statusCodes } from "@/constants/statusCodes";

// Terminates the request with 422 when any express-validator chain failed.
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(statusCodes.UNPROCESSABLE_ENTITY).json({
      message: errors.array()[0]?.msg || "Invalid request data",
      errors: errors.array(),
    });
    return;
  }
  next();
};
