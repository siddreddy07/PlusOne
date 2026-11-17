import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Turn a plain password into a hash that is safe to store.
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare a typed password with the stored hash.
export function checkPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
