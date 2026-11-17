import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../config/db.js";
import { bookings, seats } from "../db/schema.js";

// Frees every seat whose hold has run out.
// `now` is passed in (not new Date()) so tests can use a fixed clock.
// Safe to call as often as we like: if nothing expired, it changes nothing.
// Returns how many bookings expired.
export async function releaseExpiredHolds(now: Date) {
  return db.transaction(async (tx) => {
    // 1. Mark expired holds as 'expired'
    const expired = await tx
      .update(bookings)
      .set({ status: "expired" })
      .where(and(eq(bookings.status, "held"), lte(bookings.holdExpiresAt, now)))
      .returning({ id: bookings.id });

    if (expired.length === 0) {
      return 0;
    }

    // 2. Give their seats back
    const expiredIds = expired.map((booking) => booking.id);
    await tx
      .update(seats)
      .set({ status: "available", bookingId: null })
      .where(inArray(seats.bookingId, expiredIds));

    return expired.length;
  });
}
