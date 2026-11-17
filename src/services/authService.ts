import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users } from "../db/schema.js";
import { makeHttpError } from "../helpers/httpError.js";
import { checkPassword, hashPassword } from "../helpers/password.js";

// Pick only the columns that are safe to send to the browser (no passwordHash).
const safeColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
};

export async function findUserById(id: number) {
  const rows = await db.select(safeColumns).from(users).where(eq(users.id, id));
  return rows[0] ?? null;
}

// New accounts are ALWAYS attendees. Organizers are created in the database / seed.
export async function createUser(name: string, email: string, password: string) {
  const passwordHash = await hashPassword(password);

  try {
    const rows = await db
      .insert(users)
      .values({ name, email, passwordHash, role: "attendee" })
      .returning(safeColumns);
    return rows[0]!;
  } catch (error) {
    // 23505 = unique violation in Postgres (email already used).
    // Drizzle wraps the Postgres error, so the code is inside error.cause.
    const pgCode = (error as { cause?: { code?: string } }).cause?.code;
    if (pgCode === "23505") {
      throw makeHttpError(409, "Email is already registered");
    }
    throw error;
  }
}

// Check email + password. Same message for both mistakes, so nobody can guess emails.
export async function loginUser(email: string, password: string) {
  const rows = await db.select().from(users).where(eq(users.email, email));
  const user = rows[0];

  if (!user || !(await checkPassword(password, user.passwordHash))) {
    throw makeHttpError(401, "Wrong email or password");
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
