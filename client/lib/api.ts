// The ONE place that talks to the backend.
// Every page calls a function from here and never writes fetch itself.

import type { User } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Sends a request. Adds the login token if there is one.
// If the server answers with an error, it throws an Error with the server's message.
async function request(path: string, method = "GET", body?: object) {
  const response = await fetch(API_URL + path, {
    method,
    credentials: "include", // send and receive the login cookie
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  }
  return data;
}

type LoginResult = { user: User };

export function login(email: string, password: string): Promise<LoginResult> {
  return request("/auth/login", "POST", { email, password });
}

export function register(name: string, email: string, password: string): Promise<LoginResult> {
  return request("/auth/register", "POST", { name, email, password });
}

export async function getMe(): Promise<User> {
  const data = await request("/auth/me");
  return data.user;
}

// Clears the login cookie on the server.
export function logoutRequest() {
  return request("/auth/logout", "POST");
}

// One event as the list shows it. `date` is text like "2026-12-14T21:40:00.000Z".
export type EventItem = {
  id: number;
  name: string;
  description: string;
  date: string;
  venue: string;
  rowCount: number;
  seatsPerRow: number;
  totalSeats: number;
  availableSeats: number;
};

export async function getEvents(): Promise<EventItem[]> {
  const data = await request("/events");
  return data.events;
}

export async function getEvent(id: number): Promise<EventItem> {
  const data = await request(`/events/${id}`);
  return data.event;
}

// One seat on the map. "mine" is true when it belongs to the logged-in user.
export type Seat = {
  id: number;
  rowLabel: string;
  seatNumber: number;
  status: "available" | "held" | "booked";
  mine: boolean;
};

export async function getSeats(eventId: number): Promise<Seat[]> {
  const data = await request(`/events/${eventId}/seats`);
  return data.seats;
}

export type Settings = {
  hold_duration_minutes: number;
  max_seats_per_booking: number;
};

export async function getSettings(): Promise<Settings> {
  const data = await request("/settings");
  return data.settings;
}

// A booking while the seats are held for the user.
export type Hold = { id: number; holdExpiresAt: string };

export async function holdSeats(eventId: number, seatIds: number[]): Promise<Hold> {
  const data = await request("/bookings/hold", "POST", { eventId, seatIds });
  return data.booking;
}

export function confirmBooking(bookingId: number) {
  return request(`/bookings/${bookingId}/confirm`, "POST");
}

export function cancelBooking(bookingId: number) {
  return request(`/bookings/${bookingId}/cancel`, "POST");
}

// The user's bookings, newest first. `seats` are names like "A1".
export type MyBooking = {
  id: number;
  status: "held" | "confirmed" | "cancelled" | "expired";
  holdExpiresAt: string | null;
  createdAt: string;
  eventId: number;
  eventName: string;
  eventDate: string;
  venue: string;
  seats: string[];
};

export async function getMyBookings(): Promise<MyBooking[]> {
  const data = await request("/bookings/mine");
  return data.bookings;
}
