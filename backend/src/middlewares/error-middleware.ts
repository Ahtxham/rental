import { NextFunction, Request, Response } from "express";

import { MODE } from "@/constants/env";
import { statusCodes } from "@/constants/statusCodes";

interface CustomError extends Error {
  status?: number;
}

const notFound = (_req: Request, res: Response): void => {
  res.status(statusCodes.NOT_FOUND).json({
    message: "Oops! The route you are trying to access does not exist",
  });
};

// Must keep all four params. Express identifies error handlers by arity (4).
// Dropping `next` silently demotes this to a normal middleware so forwarded
// errors bypass it and hit Express's default (stack-leaking) handler.
const internalServerError = (
  error: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (MODE !== "production") {
    console.error(error);
  }

  res.status(error.status || statusCodes.INTERNAL_SERVER_ERROR).json({
    message: error.message || "Something went wrong, internal server error",
  });
};

export const errorMiddleware = { notFound, internalServerError };
