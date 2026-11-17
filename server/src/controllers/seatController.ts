import type { Request, Response } from "express";
import { getNow } from "../helpers/clock.js";
import { getEventById } from "../services/eventService.js";
import { releaseExpiredHolds } from "../services/holdService.js";
import { getSeatsForEvent } from "../services/seatService.js";

export async function getEventSeats(req: Request, res: Response) {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Event id is not valid" });
    }

    const event = await getEventById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // free expired holds first, so the map is never out of date
    await releaseExpiredHolds(getNow());

    const seats = await getSeatsForEvent(eventId, req.user.userId);
    return res.json({ seats });
  } catch (error) {
    console.log("getEventSeats error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
