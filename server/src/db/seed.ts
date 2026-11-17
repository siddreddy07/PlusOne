import { asc, eq, sql } from "drizzle-orm";
import { db, pool } from "../config/db.js";
import { getNow } from "../helpers/clock.js";
import { hashPassword } from "../helpers/password.js";
import { cancelBooking, confirmBooking, holdSeats } from "../services/bookingService.js";
import { createUser } from "../services/authService.js";
import { createEvent } from "../services/eventService.js";
import { updateSetting } from "../services/settingsService.js";
import { seats, users } from "./schema.js";

// Run with:  npm run seed
// It EMPTIES every table first, then fills them with demo data.
// Login for everyone: password123 (except the demo attendee: sidd@email.com / 12345678)

async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed refuses to run when NODE_ENV=production");
  }

  const now = getNow();
  const day = 24 * 60 * 60 * 1000;

  // 1. start from an empty database
  console.log("Emptying tables...");
  await db.execute(
    sql`truncate table booking_seats, bookings, seats, events, settings, users restart identity cascade`,
  );

  // 2. settings (the defaults)
  await updateSetting("hold_duration_minutes", 5);
  await updateSetting("max_seats_per_booking", 4);

  // 3. users: 1 organizer + 10 attendees
  console.log("Creating users...");
  const organizerRows = await db
    .insert(users)
    .values({
      name: "Olivia Organizer",
      email: "organizer@example.com",
      passwordHash: await hashPassword("password123"),
      role: "organizer",
    })
    .returning();
  const organizer = organizerRows[0]!;

  const attendees = [];
  for (let i = 1; i <= 10; i++) {
    attendees.push(await createUser(`Attendee ${i}`, `attendee${i}@example.com`, "password123"));
  }

  // the demo attendee used by the one click demo button on the login screen
  await createUser("Demo Attendee", "sidd@email.com", "12345678");

  // 4. two events: 10 x 12 = 120 seats, and 6 x 10 = 60 seats
  console.log("Creating events...");
  const bigEvent = await createEvent(
    organizer.id,
    {
      name: "Summer Music Festival",
      description: "An open-air evening with live bands and food stalls.",
      date: new Date(now.getTime() + 14 * day),
      venue: "Riverside Arena",
      rowCount: 10,
      seatsPerRow: 12,
    },
    now,
  );
  const smallEvent = await createEvent(
    organizer.id,
    {
      name: "Tech Talk Evening",
      description: "Three short talks about building web apps, followed by Q&A.",
      date: new Date(now.getTime() + 30 * day),
      venue: "City Library Hall",
      rowCount: 6,
      seatsPerRow: 10,
    },
    now,
  );

  // 5. 30 bookings: 18 for the big event, 12 for the small one
  console.log("Creating 30 bookings (this takes a minute)...");
  const plan = [
    { event: bigEvent, count: 18 },
    { event: smallEvent, count: 12 },
  ];

  let bookingNumber = 0;
  let cancelled = 0;
  for (const { event, count } of plan) {
    // every seat of this event, in order. We hand them out one after another.
    const eventSeats = await db
      .select({ id: seats.id })
      .from(seats)
      .where(eq(seats.eventId, event.id))
      .orderBy(asc(seats.id));
    let nextSeat = 0;

    for (let i = 0; i < count; i++) {
      const user = attendees[bookingNumber % attendees.length]!;
      const seatCount = 1 + (bookingNumber % 4); // 1, 2, 3 or 4 seats
      const seatIds = eventSeats.slice(nextSeat, nextSeat + seatCount).map((seat) => seat.id);
      nextSeat += seatCount;

      const booking = await holdSeats(user.id, event.id, seatIds, now);
      await confirmBooking(user.id, booking.id, now);

      // every 8th booking is cancelled, so history shows a mix
      if (bookingNumber % 8 === 7) {
        await cancelBooking(user.id, booking.id);
        cancelled++;
      }
      bookingNumber++;
    }
  }

  console.log(`Done: 12 users, 2 events (120 + 60 seats), ${bookingNumber} bookings (${cancelled} cancelled).`);
  console.log("Organizer login: organizer@example.com / password123");
  console.log("Attendee login:  attendee1@example.com / password123");
  console.log("Demo attendee:   sidd@email.com / 12345678");
}

seed()
  .catch((error) => {
    console.log("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
