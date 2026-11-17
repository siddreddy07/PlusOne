import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/config/db.js";

// Runs once before all tests: make sure the test branch has the latest tables.
export async function setup() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
}
