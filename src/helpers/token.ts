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

// Read a token. Returns null if it is fake, broken or expired.
export function readToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    return { userId: decoded.userId, role: decoded.role };
  } catch {
    return null;
  }
}
