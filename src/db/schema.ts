import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- users ----------
// role is either 'attendee' or 'organizer'
export const userRole = pgEnum("user_role", ["attendee", "organizer"]);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole().notNull().default("attendee"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- events ----------
export const events = pgTable(
  "events",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    description: text().notNull().default(""),
    date: timestamp({ withTimezone: true }).notNull(),
    venue: text().notNull(),
    rowCount: integer("row_count").notNull(),
    seatsPerRow: integer("seats_per_row").notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // the grid can never be empty
    check("events_grid_check", sql`${table.rowCount} > 0 and ${table.seatsPerRow} > 0`),
  ],
);

// ---------- bookings ----------
// status: held -> confirmed | cancelled | expired
export const bookings = pgTable(
  "bookings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    status: text().notNull().default("held"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "bookings_status_check",
      sql`${table.status} in ('held', 'confirmed', 'cancelled', 'expired')`,
    ),
    index("bookings_user_idx").on(table.userId),
    // used by the "release expired holds" query
    index("bookings_status_expiry_idx").on(table.status, table.holdExpiresAt),
  ],
);

// ---------- seats ----------
// ONE ROW PER SEAT. The double-booking check is an UPDATE on this table.
export const seats = pgTable(
  "seats",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    rowLabel: text("row_label").notNull(), // A, B, C ...
    seatNumber: integer("seat_number").notNull(), // 1, 2, 3 ...
    status: text().notNull().default("available"),
    bookingId: integer("booking_id").references(() => bookings.id),
  },
  (table) => [
    // the same seat can never exist twice in an event
    uniqueIndex("seats_unique_position").on(table.eventId, table.rowLabel, table.seatNumber),
    check("seats_status_check", sql`${table.status} in ('available', 'held', 'booked')`),
    // a seat is available ONLY when nobody owns it
    check(
      "seats_owner_check",
      sql`(${table.status} = 'available' and ${table.bookingId} is null)
        or (${table.status} <> 'available' and ${table.bookingId} is not null)`,
    ),
    index("seats_event_idx").on(table.eventId),
    index("seats_booking_idx").on(table.bookingId),
  ],
);

// ---------- settings ----------
// admin-changeable values, e.g. hold_duration_minutes, max_seats_per_booking
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: text().notNull(),
});
