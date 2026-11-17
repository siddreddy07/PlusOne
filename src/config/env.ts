import { existsSync } from "node:fs";

// Load .env.local (written by `neon deploy`) if it exists.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const DATABASE_URL = requireEnv("DATABASE_URL");
export const PORT = Number(process.env.PORT ?? 4000);
