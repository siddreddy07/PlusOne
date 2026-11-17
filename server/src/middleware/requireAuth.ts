import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAME, readToken } from "../helpers/token.js";

// Runs before protected routes. Reads the token from the "token" cookie,
// or from the header  Authorization: Bearer <token>  (used by tests and tools).
// On success it saves the user in req.user for the next functions.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = req.cookies?.[COOKIE_NAME] ?? (header.startsWith("Bearer ") ? header.slice(7) : "");
  const user = readToken(token);

  if (!user) {
    return res.status(401).json({ error: "Please log in" });
  }

  req.user = user;
  next();
}
