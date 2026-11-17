import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { settings } from "../db/schema.js";

// Every setting the organizer can change: its default value and allowed range.
// If a setting is not saved in the database yet, the default is used.
export const SETTING_RULES: Record<string, { defaultValue: number; min: number; max: number }> = {
  hold_duration_minutes: { defaultValue: 5, min: 1, max: 60 },
  max_seats_per_booking: { defaultValue: 4, min: 1, max: 20 },
};

// Read one setting as a number. It reads the database EVERY time (no caching),
// so a changed value works immediately, without restarting the server.
export async function getNumberSetting(key: string): Promise<number> {
  const rule = SETTING_RULES[key];
  if (!rule) {
    throw new Error(`Unknown setting: ${key}`);
  }

  const rows = await db.select().from(settings).where(eq(settings.key, key));
  const saved = rows[0];
  if (!saved) {
    return rule.defaultValue;
  }

  const number = Number(saved.value);
  return Number.isNaN(number) ? rule.defaultValue : number;
}

// Read all settings, e.g. { hold_duration_minutes: 5, max_seats_per_booking: 4 }
export async function getAllSettings() {
  const result: Record<string, number> = {};
  for (const key of Object.keys(SETTING_RULES)) {
    result[key] = await getNumberSetting(key);
  }
  return result;
}

// Save a new value (insert it, or update it if the key already exists).
export async function updateSetting(key: string, value: number) {
  const rule = SETTING_RULES[key];
  if (!rule) {
    throw new Error(`Unknown setting: ${key}`);
  }
  if (!Number.isInteger(value) || value < rule.min || value > rule.max) {
    throw new Error(`${key} must be a whole number from ${rule.min} to ${rule.max}`);
  }

  await db
    .insert(settings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
}
