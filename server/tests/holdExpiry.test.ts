import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { clearFixedNow, getNow, setFixedNow } from "../src/helpers/clock.js";
import { confirmBooking, holdSeats } from "../src/services/bookingService.js";
import { releaseExpiredHolds } from "../src/services/holdService.js";
import { updateSetting } from "../src/services/settingsService.js";
import {
  closeDb,
  getBooking,
  getSeat,
  getSeatIds,
  makeEvent,
  makeUser,
  resetDb,
} from "./helpers/testDb.js";

// The clock is FROZEN. Time only moves when the test moves it.
const TEN_OCLOCK = new Date("2030-01-01T10:00:00.000Z");

function minutesLater(date: Date, minutes: number, seconds = 0) {
  return new Date(date.getTime() + minutes * 60 * 1000 + seconds * 1000);
}

let attendee: Awaited<ReturnType<typeof makeUser>>;
let otherAttendee: Awaited<ReturnType<typeof makeUser>>;
let eventId: number;
let seatIds: number[];

beforeEach(async () => {
  await resetDb();
  setFixedNow(TEN_OCLOCK);

  const organizer = await makeUser("organizer", "organizer");
  attendee = await makeUser("attendee1");
  otherAttendee = await makeUser("attendee2");
  const event = await makeEvent(organizer.id, getNow());
  eventId = event.id;
  seatIds = await getSeatIds(eventId);
});

afterAll(async () => {
  clearFixedNow();
  await closeDb();
});

describe("expired holds", () => {
  it("a hold made at 10:00 expires at 10:05 (default 5 minutes)", async () => {
    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());

    expect(booking.holdExpiresAt).toEqual(new Date("2030-01-01T10:05:00.000Z"));
  });

  it("is NOT released one second before the hold ends (10:04:59)", async () => {
    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());

    setFixedNow(minutesLater(TEN_OCLOCK, 4, 59));
    const released = await releaseExpiredHolds(getNow());

    expect(released).toBe(0);
    expect((await getSeat(seatIds[0]!)).status).toBe("held");
    expect((await getBooking(booking.id)).status).toBe("held");
  });

  it("IS released exactly when the hold ends (10:05:00)", async () => {
    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!, seatIds[1]!], getNow());

    setFixedNow(minutesLater(TEN_OCLOCK, 5));
    const released = await releaseExpiredHolds(getNow());

    expect(released).toBe(1);
    const seat = await getSeat(seatIds[0]!);
    expect(seat.status).toBe("available");
    expect(seat.bookingId).toBeNull();
    expect((await getSeat(seatIds[1]!)).status).toBe("available");
    // an unpaid hold that ran out leaves no booking behind
    expect(await getBooking(booking.id)).toBeUndefined();
  });

  it("a released seat can be held by someone else", async () => {
    await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());

    setFixedNow(minutesLater(TEN_OCLOCK, 5));
    // no manual release: holdSeats frees expired holds by itself
    const booking = await holdSeats(otherAttendee.id, eventId, [seatIds[0]!], getNow());

    expect((await getSeat(seatIds[0]!)).bookingId).toBe(booking.id);
  });

  it("can be confirmed at 10:04:59 but not at 10:05:00", async () => {
    const early = await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());
    const late = await holdSeats(attendee.id, eventId, [seatIds[1]!], getNow());

    setFixedNow(minutesLater(TEN_OCLOCK, 4, 59));
    const confirmed = await confirmBooking(attendee.id, early.id, getNow());
    expect(confirmed.status).toBe("confirmed");

    setFixedNow(minutesLater(TEN_OCLOCK, 5));
    await expect(confirmBooking(attendee.id, late.id, getNow())).rejects.toThrow("expired");
  });

  it("a confirmed booking never expires", async () => {
    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());
    await confirmBooking(attendee.id, booking.id, getNow());

    setFixedNow(minutesLater(TEN_OCLOCK, 60 * 24));
    const released = await releaseExpiredHolds(getNow());

    expect(released).toBe(0);
    expect((await getSeat(seatIds[0]!)).status).toBe("booked");
  });

  it("changing the hold duration setting changes the expiry (no code change)", async () => {
    await updateSetting("hold_duration_minutes", 1);

    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());

    expect(booking.holdExpiresAt).toEqual(new Date("2030-01-01T10:01:00.000Z"));
  });
});
