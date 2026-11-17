// The ONE place that talks to the backend.
// Every page calls a function from here and never writes fetch itself.

import { getToken, type User } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Sends a request. Adds the login token if there is one.
// If the server answers with an error, it throws an Error with the server's message.
async function request(path: string, method = "GET", body?: object) {
  const token = getToken();

  const response = await fetch(API_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Something went wrong. Please try again.");
  }
  return data;
}

type LoginResult = { user: User; token: string };

export function login(email: string, password: string): Promise<LoginResult> {
  return request("/auth/login", "POST", { email, password });
}

export function register(name: string, email: string, password: string): Promise<LoginResult> {
  return request("/auth/register", "POST", { name, email, password });
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
