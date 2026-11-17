import type { Request, Response } from "express";
import { z } from "zod";
import { getNow } from "../helpers/clock.js";
import {
  createEvent,
  getEventById,
  listEvents,
  updateEvent,
} from "../services/eventService.js";

const eventSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().default(""),
  date: z.coerce.date({ error: "Date is not valid" }),
  venue: z.string().trim().min(1, "Venue is required"),
  rowCount: z
    .number("Rows must be a number")
    .int("Rows must be a whole number")
    .min(1, "Seating grid cannot be empty")
    .max(26, "Maximum 26 rows"),
  seatsPerRow: z
    .number("Seats per row must be a number")
    .int("Seats per row must be a whole number")
    .min(1, "Seating grid cannot be empty")
    .max(50, "Maximum 50 seats per row"),
});

export async function getEvents(_req: Request, res: Response) {
  try {
    const allEvents = await listEvents();
    return res.json({ events: allEvents });
  } catch (error) {
    console.log("getEvents error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

export async function getEvent(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Event id is not valid" });
    }

    const event = await getEventById(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    return res.json({ event });
  } catch (error) {
    console.log("getEvent error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

export async function addEvent(req: Request, res: Response) {
  try {
    const input = eventSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: input.error.issues[0]?.message });
    }

    const event = await createEvent(res.locals.user.userId, input.data, getNow());
    return res.status(201).json({ event });
  } catch (error) {
    console.log("addEvent error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

export async function changeEvent(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Event id is not valid" });
    }

    const input = eventSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: input.error.issues[0]?.message });
    }

    const event = await updateEvent(id, input.data, getNow());
    return res.json({ event });
  } catch (error) {
    console.log("changeEvent error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}
