import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearFixedNow, getNow, setFixedNow } from "../src/helpers/clock.js";
import { holdSeats } from "../src/services/bookingService.js";
import {
  closeDb,
  countBookings,
  getSeat,
  getSeatIds,
  makeEvent,
  makeUser,
  resetDb,
  splitResults,
} from "./helpers/testDb.js";

const ROUNDS = 20;
const TEN_OCLOCK = new Date("2030-01-01T10:00:00.000Z");

let alice: Awaited<ReturnType<typeof makeUser>>;
let bob: Awaited<ReturnType<typeof makeUser>>;
let eventId: number;
let seatIds: number[];

// This file's tests use different seats, so we set up once (the database is in the cloud).
beforeAll(async () => {
  await resetDb();
  setFixedNow(TEN_OCLOCK);

  const organizer = await makeUser("organizer", "organizer");
  alice = await makeUser("alice");
  bob = await makeUser("bob");
  // 10 rows x 14 seats = 140 seats, plenty of fresh seats for every round
  const event = await makeEvent(organizer.id, getNow(), 10, 14);
  eventId = event.id;
  seatIds = await getSeatIds(eventId);
});

afterAll(async () => {
  clearFixedNow();
  await closeDb();
});

describe("double booking is impossible", () => {
  it(
    `two people click the SAME seat at the SAME moment: exactly one wins (x${ROUNDS})`,
    async () => {
      const bookingsBefore = await countBookings();

      for (let round = 0; round < ROUNDS; round++) {
        const seatId = seatIds[round]!;

        // both requests start together
        const results = await Promise.allSettled([
          holdSeats(alice.id, eventId, [seatId], getNow()),
          holdSeats(bob.id, eventId, [seatId], getNow()),
        ]);
        const { winners, errors } = splitResults(results);

        expect(winners).toHaveLength(1);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain("just taken");

        // the seat belongs to the winner's booking, and only to it
        const seat = await getSeat(seatId);
        expect(seat.status).toBe("held");
        expect(seat.bookingId).toBe(winners[0]!.id);
      }

      // every loser rolled back: only the winners' bookings exist
      expect((await countBookings()) - bookingsBefore).toBe(ROUNDS);
    },
    5 * 60 * 1000,
  );

  it(
    "six people fight for one seat: exactly one wins",
    async () => {
      const seatId = seatIds[ROUNDS]!;
      const crowd = await Promise.all(["u1", "u2", "u3", "u4", "u5", "u6"].map((n) => makeUser(n)));

      const results = await Promise.allSettled(
        crowd.map((user) => holdSeats(user.id, eventId, [seatId], getNow())),
      );
      const { winners, errors } = splitResults(results);

      expect(winners).toHaveLength(1);
      expect(errors).toHaveLength(5);
      expect((await getSeat(seatId)).bookingId).toBe(winners[0]!.id);
    },
    2 * 60 * 1000,
  );

  it(
    "overlapping seats [1,2] vs [2,3]: only one wins and it is all-or-nothing (x10)",
    async () => {
      for (let round = 0; round < 10; round++) {
        const base = ROUNDS + 1 + round * 3;
        const [s1, s2, s3] = [seatIds[base]!, seatIds[base + 1]!, seatIds[base + 2]!];

        const results = await Promise.allSettled([
          holdSeats(alice.id, eventId, [s1, s2], getNow()),
          holdSeats(bob.id, eventId, [s2, s3], getNow()),
        ]);
        const { winners, errors } = splitResults(results);

        expect(winners).toHaveLength(1);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toContain("just taken"); // not a deadlock error

        const aliceWon = results[0]!.status === "fulfilled";
        if (aliceWon) {
          expect((await getSeat(s1)).bookingId).toBe(winners[0]!.id);
          expect((await getSeat(s2)).bookingId).toBe(winners[0]!.id);
          // Bob lost, so the seat only he wanted must be untouched
          expect((await getSeat(s3)).status).toBe("available");
        } else {
          expect((await getSeat(s2)).bookingId).toBe(winners[0]!.id);
          expect((await getSeat(s3)).bookingId).toBe(winners[0]!.id);
          expect((await getSeat(s1)).status).toBe("available");
        }
      }
    },
    5 * 60 * 1000,
  );

  it(
    "same seats asked in opposite order [1,2] vs [2,1]: no deadlock, one winner (x10)",
    async () => {
      for (let round = 0; round < 10; round++) {
        const base = ROUNDS + 1 + 30 + round * 2;
        const [s1, s2] = [seatIds[base]!, seatIds[base + 1]!];

        const results = await Promise.allSettled([
          holdSeats(alice.id, eventId, [s1, s2], getNow()),
          holdSeats(bob.id, eventId, [s2, s1], getNow()),
        ]);
        const { winners, errors } = splitResults(results);

        expect(winners).toHaveLength(1);
        expect(errors).toHaveLength(1);
        expect(errors[0]).not.toContain("deadlock");
        expect(errors[0]).toContain("just taken");
      }
    },
    5 * 60 * 1000,
  );
});
