import type { Response } from "express";
import jwt from "jsonwebtoken";

export type Role = "attendee" | "organizer";

// Comes from .env.local (loaded by the npm scripts with --env-file)
const JWT_SECRET = process.env.JWT_SECRET!;

// What we store inside the token.
export type TokenPayload = {
  userId: number;
  role: Role;
};

// Make a login token that expires in 1 day.
export function makeToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export const COOKIE_NAME = "token";

const cookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read it
  sameSite: "none" as const, // frontend and API can be on different domains
  secure: true, // required by sameSite none (browsers allow it on localhost too)
  path: "/",
};

// Put the token in a cookie on the response.
export function setTokenCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
}

export function clearTokenCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

// Read a token. Returns null if it is fake, broken or expired.
export function readToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}
