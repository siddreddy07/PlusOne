import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isHttpError } from "../helpers/httpError.js";

// Last middleware. Every error in the app ends up here.
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join(", ");
    return res.status(400).json({ error: message });
  }

  if (isHttpError(error)) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error(error);
  res.status(500).json({ error: "Something went wrong" });
}
