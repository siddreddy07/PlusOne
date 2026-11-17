import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/config/db.js";
import { bookings, seats } from "../src/db/schema.js";
import { clearFixedNow, getNow, setFixedNow } from "../src/helpers/clock.js";
import { closeDb, getSeat, getSeatIds, makeEvent, makeUser, resetDb } from "./helpers/testDb.js";

// These tests skip our services and talk to the DATABASE directly.
// They prove the rules live in the database, so the UI / API cannot bypass them.

const TEN_OCLOCK = new Date("2030-01-01T10:00:00.000Z");
let eventId: number;
let seatIds: number[];
let userId: number;

beforeAll(async () => {
  await resetDb();
  setFixedNow(TEN_OCLOCK);
  const organizer = await makeUser("organizer", "organizer");
  userId = (await makeUser("alice")).id;
  const event = await makeEvent(organizer.id, getNow());
  eventId = event.id;
  seatIds = await getSeatIds(eventId);
});

afterAll(async () => {
  clearFixedNow();
  await closeDb();
});

async function newBooking() {
  const rows = await db
    .insert(bookings)
    .values({ userId, eventId, status: "held", holdExpiresAt: new Date("2030-01-01T10:05:00Z") })
    .returning();
  return rows[0]!;
}

// the exact claim statement that holdSeats runs
async function tryToClaim(seatId: number, bookingId: number) {
  const claimed = await db
    .update(seats)
    .set({ status: "held", bookingId })
    .where(sql`${seats.id} = ${seatId} and ${seats.status} = 'available'`)
    .returning({ id: seats.id });
  return claimed.length;
}

describe("the database itself prevents double booking", () => {
  it("the second claim on the same seat changes 0 rows", async () => {
    const first = await newBooking();
    const second = await newBooking();

    expect(await tryToClaim(seatIds[0]!, first.id)).toBe(1);
    expect(await tryToClaim(seatIds[0]!, second.id)).toBe(0);

    expect((await getSeat(seatIds[0]!)).bookingId).toBe(first.id);
  });

  it("a seat cannot be 'held' without an owner (check constraint)", async () => {
    await expect(
      db.update(seats).set({ status: "held" }).where(eq(seats.id, seatIds[1]!)),
    ).rejects.toThrow();
  });

  it("an 'available' seat cannot have an owner (check constraint)", async () => {
    const booking = await newBooking();
    await expect(
      db.update(seats).set({ bookingId: booking.id }).where(eq(seats.id, seatIds[2]!)),
    ).rejects.toThrow();
  });

  it("the same seat position cannot exist twice in an event (unique index)", async () => {
    await expect(
      db.insert(seats).values({ eventId, rowLabel: "A", seatNumber: 1 }),
    ).rejects.toThrow();
  });
});
