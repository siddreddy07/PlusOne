import { asc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { bookings, events, seats } from "../db/schema.js";
import { makeSeatList } from "../helpers/seatGrid.js";

// What the organizer fills in the event form.
export type EventInput = {
  name: string;
  description: string;
  date: Date;
  venue: string;
  rowCount: number;
  seatsPerRow: number;
};

export async function listEvents() {
  return db.select().from(events).orderBy(asc(events.date));
}

export async function getEventById(id: number) {
  const rows = await db.select().from(events).where(eq(events.id, id));
  return rows[0] ?? null;
}

// Creates the event AND all its seats in ONE transaction.
// If anything fails, nothing is saved (no event without seats).
export async function createEvent(userId: number, input: EventInput, now: Date) {
  if (input.date <= now) {
    throw new Error("Event date must be in the future");
  }

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(events)
      .values({ ...input, createdBy: userId })
      .returning();
    const event = created[0]!;

    const seatRows = makeSeatList(input.rowCount, input.seatsPerRow).map((seat) => ({
      eventId: event.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
    }));
    await tx.insert(seats).values(seatRows);

    return event;
  });
}

// Changes an event. The seating grid can only change while nobody has booked yet.
export async function updateEvent(id: number, input: EventInput, now: Date) {
  const event = await getEventById(id);
  if (!event) {
    throw new Error("Event not found");
  }
  if (input.date <= now) {
    throw new Error("Event date must be in the future");
  }

  const gridChanged =
    input.rowCount !== event.rowCount || input.seatsPerRow !== event.seatsPerRow;

  if (gridChanged) {
    const existingBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.eventId, id))
      .limit(1);
    if (existingBookings.length > 0) {
      throw new Error("Seating cannot be changed after bookings exist");
    }
  }

  return db.transaction(async (tx) => {
    const updated = await tx.update(events).set(input).where(eq(events.id, id)).returning();

    if (gridChanged) {
      // no bookings yet, so it is safe to throw the old seats away and rebuild them
      await tx.delete(seats).where(eq(seats.eventId, id));
      const seatRows = makeSeatList(input.rowCount, input.seatsPerRow).map((seat) => ({
        eventId: id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
      }));
      await tx.insert(seats).values(seatRows);
    }

    return updated[0]!;
  });
}
