import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

if (existsSync(".env.test")) {
  process.loadEnvFile(".env.test");
}
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local"); // JWT_SECRET, and the real database url (only to compare below)
}

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is missing. See .env.example");
}

// SAFETY: tests wipe tables. Refuse to run if the test url is the real database.
const testHost = new URL(testUrl).host;
for (const realUrl of [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED]) {
  if (realUrl && new URL(realUrl).host.replace("-pooler", "") === testHost.replace("-pooler", "")) {
    throw new Error("TEST_DATABASE_URL points at the real database. Use the Neon test branch.");
  }
}

// from here on, everything in the tests talks to the TEST branch
process.env.DATABASE_URL = testUrl;

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    env: { DATABASE_URL: testUrl },
    // all test files share one database, so run them one after another
    fileParallelism: false,
    // the database is in the cloud, so give it time
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
