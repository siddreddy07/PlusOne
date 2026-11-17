import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../config/db.js";
import { bookingSeats, bookings, seats } from "../db/schema.js";

// Frees every seat whose hold has run out, and removes those unpaid bookings.
// A payment that was never finished is not kept anywhere.
// `now` is passed in (not new Date()) so tests can use a fixed clock.
// Safe to call as often as we like: if nothing expired, it changes nothing.
// Returns how many bookings expired.
export async function releaseExpiredHolds(now: Date) {
  return db.transaction(async (tx) => {
    // 1. Claim the expired holds. This only matches bookings that are STILL held,
    //    so a payment confirmed a moment ago is never touched.
    const expired = await tx
      .update(bookings)
      .set({ status: "expired" })
      .where(and(eq(bookings.status, "held"), lte(bookings.holdExpiresAt, now)))
      .returning({ id: bookings.id });

    if (expired.length === 0) {
      return 0;
    }

    const expiredIds = expired.map((booking) => booking.id);

    // 2. Give their seats back
    await tx
      .update(seats)
      .set({ status: "available", bookingId: null })
      .where(inArray(seats.bookingId, expiredIds));

    // 3. Delete the bookings (their seat lines first, because they point at the booking)
    await tx.delete(bookingSeats).where(inArray(bookingSeats.bookingId, expiredIds));
    await tx.delete(bookings).where(inArray(bookings.id, expiredIds));

    return expired.length;
  });
}
