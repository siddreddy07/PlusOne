import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { bookingSeats, bookings, events, seats } from "../db/schema.js";
import { releaseExpiredHolds } from "./holdService.js";
import { getNumberSetting } from "./settingsService.js";

// ------------------------------------------------------------------
// 1. HOLD seats  (the double-booking check lives here)
// ------------------------------------------------------------------
export async function holdSeats(userId: number, eventId: number, seatIds: number[], now: Date) {
  // simple checks first
  if (seatIds.length === 0) {
    throw new Error("Pick at least one seat");
  }
  if (new Set(seatIds).size !== seatIds.length) {
    throw new Error("The same seat was picked twice");
  }

  // the limits come from the settings table, so an organizer can change them
  const maxSeats = await getNumberSetting("max_seats_per_booking");
  if (seatIds.length > maxSeats) {
    throw new Error(`You can book at most ${maxSeats} seats at a time`);
  }

  const eventRows = await db.select().from(events).where(eq(events.id, eventId));
  const event = eventRows[0];
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.date <= now) {
    throw new Error("This event has already started");
  }

  // free seats whose hold already ran out, so they can be picked again
  await releaseExpiredHolds(now);

  const holdMinutes = await getNumberSetting("hold_duration_minutes");
  const holdExpiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);

  // always lock seats in the same order, so two people fighting over
  // overlapping seats cannot block each other forever (deadlock)
  const sortedSeatIds = [...seatIds].sort((a, b) => a - b);

  // ONE transaction = all or nothing
  return db.transaction(async (tx) => {
    // 1. create the booking
    const created = await tx
      .insert(bookings)
      .values({ userId, eventId, status: "held", holdExpiresAt })
      .returning();
    const booking = created[0]!;

    // 2. THE DOUBLE-BOOKING CHECK.
    // This is ONE sql statement. Postgres locks each seat row while updating it.
    // If two people click the same seat at the same moment, one update runs first.
    // The second one waits, then sees the seat is no longer 'available',
    // so it changes 0 rows for that seat.
    const heldSeats = await tx
      .update(seats)
      .set({ status: "held", bookingId: booking.id })
      .where(
        and(
          inArray(seats.id, sortedSeatIds),
          eq(seats.eventId, eventId),
          eq(seats.status, "available"),
        ),
      )
      .returning({ id: seats.id });

    // 3. did we get ALL the seats? If not, throw.
    // Throwing rolls the transaction back: the booking row disappears
    // and any seats we did get are given back.
    if (heldSeats.length !== sortedSeatIds.length) {
      throw new Error("Some of these seats were just taken. Please pick other seats.");
    }

    // 4. remember which seats belong to this booking (for history)
    await tx
      .insert(bookingSeats)
      .values(sortedSeatIds.map((seatId) => ({ bookingId: booking.id, seatId })));

    return booking;
  });
}

// ------------------------------------------------------------------
// 2. CONFIRM a hold  (held -> confirmed, seats held -> booked)
// ------------------------------------------------------------------
export async function confirmBooking(userId: number, bookingId: number, now: Date) {
  const found = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));
  const booking = found[0];

  if (!booking) {
    throw new Error("Booking not found");
  }
  if (booking.status !== "held") {
    throw new Error(`This booking is already ${booking.status}`);
  }
  if (booking.holdExpiresAt <= now) {
    throw new Error("Your hold has expired. Please pick seats again.");
  }

  return db.transaction(async (tx) => {
    // only changes the booking if it is STILL held and NOT expired
    const updated = await tx
      .update(bookings)
      .set({ status: "confirmed" })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.status, "held"),
          gt(bookings.holdExpiresAt, now),
        ),
      )
      .returning();

    if (updated.length === 0) {
      throw new Error("This booking can no longer be confirmed");
    }

    await tx.update(seats).set({ status: "booked" }).where(eq(seats.bookingId, bookingId));

    return updated[0]!;
  });
}

// ------------------------------------------------------------------
// 3. CANCEL a booking  (frees the seats)
// ------------------------------------------------------------------
export async function cancelBooking(userId: number, bookingId: number) {
  const found = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));
  const booking = found[0];

  if (!booking) {
    throw new Error("Booking not found");
  }
  if (booking.status === "cancelled" || booking.status === "expired") {
    throw new Error(`This booking is already ${booking.status}`);
  }

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(bookings)
      .set({ status: "cancelled" })
      .where(and(eq(bookings.id, bookingId), inArray(bookings.status, ["held", "confirmed"])))
      .returning();

    if (updated.length === 0) {
      throw new Error("This booking can no longer be cancelled");
    }

    // give the seats back
    await tx
      .update(seats)
      .set({ status: "available", bookingId: null })
      .where(eq(seats.bookingId, bookingId));

    return updated[0]!;
  });
}

// ------------------------------------------------------------------
// 4. HISTORY: all bookings of one user, newest first
// ------------------------------------------------------------------
export async function listMyBookings(userId: number) {
  const myBookings = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      holdExpiresAt: bookings.holdExpiresAt,
      createdAt: bookings.createdAt,
      eventId: events.id,
      eventName: events.name,
      eventDate: events.date,
      venue: events.venue,
    })
    .from(bookings)
    .innerJoin(events, eq(bookings.eventId, events.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.createdAt));

  if (myBookings.length === 0) {
    return [];
  }

  // get the seats of all these bookings in one query
  const bookingIds = myBookings.map((booking) => booking.id);
  const seatRows = await db
    .select({
      bookingId: bookingSeats.bookingId,
      rowLabel: seats.rowLabel,
      seatNumber: seats.seatNumber,
    })
    .from(bookingSeats)
    .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
    .where(inArray(bookingSeats.bookingId, bookingIds));

  // attach seat names like "A1" to each booking
  return myBookings.map((booking) => ({
    ...booking,
    seats: seatRows
      .filter((seat) => seat.bookingId === booking.id)
      .map((seat) => `${seat.rowLabel}${seat.seatNumber}`),
  }));
}
