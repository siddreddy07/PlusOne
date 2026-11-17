import type { NextFunction, Request, Response } from "express";
import { makeHttpError } from "../helpers/httpError.js";
import type { Role } from "../helpers/token.js";

// Use AFTER requireAuth:  router.post("/", requireAuth, requireRole("organizer"), ...)
export function requireRole(role: Role) {
  return function (_req: Request, res: Response, next: NextFunction) {
    if (res.locals.user?.role !== role) {
      return next(makeHttpError(403, "You are not allowed to do this"));
    }
    next();
  };
}
