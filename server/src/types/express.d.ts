import type { TokenPayload } from "../helpers/token.js";

// Tells TypeScript that req.user exists.
// requireAuth fills it in, so only use req.user on routes that have requireAuth.
declare global {
  namespace Express {
    interface Request {
      user: TokenPayload;
    }
  }
}
