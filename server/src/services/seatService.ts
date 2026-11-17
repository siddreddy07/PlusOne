import { asc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { bookings, seats } from "../db/schema.js";

// The seat map for one event: every seat with its status.
// We only send the status and a "mine" flag, never other people's ids.
export async function getSeatsForEvent(eventId: number, userId: number) {
  const rows = await db
    .select({
      id: seats.id,
      rowLabel: seats.rowLabel,
      seatNumber: seats.seatNumber,
      status: seats.status,
      ownerId: bookings.userId,
    })
    .from(seats)
    .leftJoin(bookings, eq(seats.bookingId, bookings.id))
    .where(eq(seats.eventId, eventId))
    .orderBy(asc(seats.rowLabel), asc(seats.seatNumber));

  return rows.map((row) => ({
    id: row.id,
    rowLabel: row.rowLabel,
    seatNumber: row.seatNumber,
    status: row.status,
    mine: row.ownerId === userId, // true if this seat belongs to the logged-in user
  }));
}
