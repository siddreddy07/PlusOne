import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// One shared connection pool for the whole server.
// DATABASE_URL is Neon's pooled URL, which is meant for app traffic.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool);

export async function checkDb(): Promise<string> {
  const result = await pool.query("select version() as version");
  return result.rows[0].version;
}
