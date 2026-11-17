import { eq, sql } from "drizzle-orm";
import { db, pool } from "../../src/config/db.js";
import { bookings, seats, users } from "../../src/db/schema.js";
import { createEvent } from "../../src/services/eventService.js";

// Empty every table. Only ever runs on the TEST branch.
export async function resetDb() {
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) {
    throw new Error("Refusing to wipe tables: not connected to the test database");
  }
  await db.execute(
    sql`truncate table booking_seats, bookings, seats, events, settings, users restart identity cascade`,
  );
}

export async function closeDb() {
  await pool.end();
}

export async function makeUser(name: string, role: "attendee" | "organizer" = "attendee") {
  const rows = await db
    .insert(users)
    .values({ name, email: `${name}@test.com`, passwordHash: "not-a-real-hash", role })
    .returning();
  return rows[0]!;
}

// A small event: 3 rows x 4 seats = 12 seats. `now` is the (fixed) current time.
export async function makeEvent(organizerId: number, now: Date, rowCount = 3, seatsPerRow = 4) {
  const eventDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
  return createEvent(
    organizerId,
    { name: "Test Event", description: "", date: eventDate, venue: "Test Hall", rowCount, seatsPerRow },
    now,
  );
}

export async function getSeatIds(eventId: number) {
  const rows = await db.select().from(seats).where(eq(seats.eventId, eventId)).orderBy(seats.id);
  return rows.map((seat) => seat.id);
}

export async function getSeat(seatId: number) {
  const rows = await db.select().from(seats).where(eq(seats.id, seatId));
  return rows[0]!;
}

export async function countBookings() {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(bookings);
  return rows[0]!.n;
}

// Turns Promise.allSettled results into: the bookings that won, and the error messages of losers.
export function splitResults(results: PromiseSettledResult<{ id: number }>[]) {
  const winners: { id: number }[] = [];
  const errors: string[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      winners.push(result.value);
    } else {
      errors.push(result.reason.message);
    }
  }
  return { winners, errors };
}

export async function getBooking(bookingId: number) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  return rows[0]!;
}
