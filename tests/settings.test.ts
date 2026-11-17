import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearFixedNow, getNow, setFixedNow } from "../src/helpers/clock.js";
import { holdSeats } from "../src/services/bookingService.js";
import { getAllSettings, updateSetting } from "../src/services/settingsService.js";
import { closeDb, getSeatIds, makeEvent, makeUser, resetDb } from "./helpers/testDb.js";

const TEN_OCLOCK = new Date("2030-01-01T10:00:00.000Z");
let alice: Awaited<ReturnType<typeof makeUser>>;
let eventId: number;
let seatIds: number[];

beforeAll(async () => {
  await resetDb();
  setFixedNow(TEN_OCLOCK);
  const organizer = await makeUser("organizer", "organizer");
  alice = await makeUser("alice");
  const event = await makeEvent(organizer.id, getNow(), 3, 4);
  eventId = event.id;
  seatIds = await getSeatIds(eventId);
});

afterAll(async () => {
  clearFixedNow();
  await closeDb();
});

describe("settings change behaviour without a code change", () => {
  it("uses the defaults when nothing is saved (5 minutes, 4 seats)", async () => {
    expect(await getAllSettings()).toEqual({
      hold_duration_minutes: 5,
      max_seats_per_booking: 4,
    });
  });

  it("default max is 4: five seats are refused", async () => {
    await expect(
      holdSeats(alice.id, eventId, seatIds.slice(0, 5), getNow()),
    ).rejects.toThrow("at most 4");
  });

  it("max = 2: three seats are refused, two are fine", async () => {
    await updateSetting("max_seats_per_booking", 2);

    await expect(
      holdSeats(alice.id, eventId, seatIds.slice(0, 3), getNow()),
    ).rejects.toThrow("at most 2");

    const booking = await holdSeats(alice.id, eventId, seatIds.slice(0, 2), getNow());
    expect(booking.status).toBe("held");
  });

  it("max = 4 again: three seats now work", async () => {
    await updateSetting("max_seats_per_booking", 4);

    const booking = await holdSeats(alice.id, eventId, seatIds.slice(2, 5), getNow());
    expect(booking.status).toBe("held");
  });

  it("refuses values outside the allowed range", async () => {
    await expect(updateSetting("max_seats_per_booking", 0)).rejects.toThrow();
    await expect(updateSetting("max_seats_per_booking", 21)).rejects.toThrow();
    await expect(updateSetting("hold_duration_minutes", 2.5)).rejects.toThrow();
    await expect(updateSetting("not_a_setting", 3)).rejects.toThrow("Unknown setting");
  });
});
