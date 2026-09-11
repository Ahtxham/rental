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

  /**
   * A Mongoose validation failure is the caller's fault, not the server's.
   *
   * It was answering 500, which tells whoever is using the screen that
   * something broke rather than that a field needs fixing, and it puts a real
   * problem in the error logs under the same heading as a crash. Clearing a
   * required field is the ordinary way to hit this.
   *
   * The message is Mongoose's own, which reads as "Admin validation failed:
   * phone: Path `phone` is required." That is not good copy, but it names the
   * field, and it is far better than a bare 500.
   */
  const status =
    (error as { name?: string }).name === "ValidationError"
      ? statusCodes.UNPROCESSABLE_ENTITY
      : error.status || statusCodes.INTERNAL_SERVER_ERROR;

  res.status(status).json({
    message: error.message || "Something went wrong, internal server error",
  });
};

export const errorMiddleware = { notFound, internalServerError };
