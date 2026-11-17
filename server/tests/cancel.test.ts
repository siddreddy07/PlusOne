import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { clearFixedNow, getNow, setFixedNow } from "../src/helpers/clock.js";
import { cancelBooking, confirmBooking, holdSeats, listMyBookings } from "../src/services/bookingService.js";
import {
  closeDb,
  getBooking,
  getSeat,
  getSeatIds,
  makeEvent,
  makeUser,
  resetDb,
} from "./helpers/testDb.js";

const TEN_OCLOCK = new Date("2030-01-01T10:00:00.000Z");

let attendee: Awaited<ReturnType<typeof makeUser>>;
let eventId: number;
let seatIds: number[];

beforeEach(async () => {
  await resetDb();
  setFixedNow(TEN_OCLOCK);
  const organizer = await makeUser("organizer", "organizer");
  attendee = await makeUser("attendee1");
  eventId = (await makeEvent(organizer.id, getNow())).id;
  seatIds = await getSeatIds(eventId);
});

afterAll(async () => {
  clearFixedNow();
  await closeDb();
});

describe("cancelling", () => {
  it("cancelling during payment (still held) frees the seats and keeps NO booking", async () => {
    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!, seatIds[1]!], getNow());

    await cancelBooking(attendee.id, booking.id);

    expect(await getBooking(booking.id)).toBeUndefined();
    expect((await listMyBookings(attendee.id)).length).toBe(0);
    const seat = await getSeat(seatIds[0]!);
    expect(seat.status).toBe("available");
    expect(seat.bookingId).toBeNull();
  });

  it("cancelling a paid booking frees the seats but keeps it as 'cancelled'", async () => {
    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());
    await confirmBooking(attendee.id, booking.id, getNow());

    await cancelBooking(attendee.id, booking.id);

    expect((await getBooking(booking.id)).status).toBe("cancelled");
    const history = await listMyBookings(attendee.id);
    expect(history.length).toBe(1);
    expect(history[0]!.status).toBe("cancelled");
    expect(history[0]!.seats.length).toBe(1); // its seats are still listed
    expect((await getSeat(seatIds[0]!)).status).toBe("available");
  });

  it("a cancelled booking cannot be cancelled again", async () => {
    const booking = await holdSeats(attendee.id, eventId, [seatIds[0]!], getNow());
    await confirmBooking(attendee.id, booking.id, getNow());
    await cancelBooking(attendee.id, booking.id);

    await expect(cancelBooking(attendee.id, booking.id)).rejects.toThrow("already cancelled");
  });
});
