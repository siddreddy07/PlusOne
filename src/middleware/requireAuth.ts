import type { NextFunction, Request, Response } from "express";
import { makeHttpError } from "../helpers/httpError.js";
import { readToken } from "../helpers/token.js";

// Runs before protected routes. Expects:  Authorization: Bearer <token>
// On success it saves the user in res.locals.user for the next functions.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const user = readToken(token);

  if (!user) {
    return next(makeHttpError(401, "Please log in"));
  }

  res.locals.user = user;
  next();
}
