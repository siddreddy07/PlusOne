import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { makeToken } from "../src/helpers/token.js";
import { closeDb, makeUser, resetDb } from "./helpers/testDb.js";

// These tests go through the real HTTP routes.
let server: Server;
let baseUrl: string;
let attendeeToken: string;
let organizerToken: string;

beforeAll(async () => {
  await resetDb();
  const organizer = await makeUser("organizer", "organizer");
  const attendee = await makeUser("attendee");
  organizerToken = makeToken({ userId: organizer.id, role: "organizer" });
  attendeeToken = makeToken({ userId: attendee.id, role: "attendee" });

  server = app.listen(0); // port 0 = any free port
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.close();
  await closeDb();
});

async function call(method: string, path: string, token: string | null, body?: object) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: (await response.json()) as any };
}

const inAWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const eventForm = () => ({
  name: "Concert",
  description: "",
  date: inAWeek(),
  venue: "Hall",
  rowCount: 2,
  seatsPerRow: 3,
});

describe("roles are enforced on the server", () => {
  it("no token = 401", async () => {
    expect((await call("POST", "/events", null, eventForm())).status).toBe(401);
    expect((await call("GET", "/events", null)).status).toBe(401);
  });

  it("an attendee cannot create or change events", async () => {
    expect((await call("POST", "/events", attendeeToken, eventForm())).status).toBe(403);
    expect((await call("PUT", "/events/1", attendeeToken, eventForm())).status).toBe(403);
  });

  it("an attendee cannot change settings", async () => {
    const response = await call("PUT", "/settings/max_seats_per_booking", attendeeToken, { value: 9 });
    expect(response.status).toBe(403);
  });

  it("an organizer can create an event and change settings", async () => {
    const created = await call("POST", "/events", organizerToken, eventForm());
    expect(created.status).toBe(201);

    const changed = await call("PUT", "/settings/max_seats_per_booking", organizerToken, { value: 3 });
    expect(changed.status).toBe(200);
  });

  it("an organizer cannot use the attendee booking routes", async () => {
    const response = await call("POST", "/bookings/hold", organizerToken, { eventId: 1, seatIds: [1] });
    expect(response.status).toBe(403);
  });

  it("a new registration is always an attendee, even if it asks to be an organizer", async () => {
    const response = await call("POST", "/auth/register", null, {
      name: "Sneaky",
      email: "sneaky@test.com",
      password: "password123",
      role: "organizer",
    });
    expect(response.status).toBe(201);
    expect(response.data.user.role).toBe("attendee");
  });
});

describe("event form validation", () => {
  it("rejects a date in the past", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const response = await call("POST", "/events", organizerToken, { ...eventForm(), date: past });
    expect(response.status).toBe(400);
  });

  it("rejects an empty seating grid", async () => {
    expect((await call("POST", "/events", organizerToken, { ...eventForm(), rowCount: 0 })).status).toBe(400);
    expect((await call("POST", "/events", organizerToken, { ...eventForm(), seatsPerRow: 0 })).status).toBe(400);
  });
});
