import type { Request, Response } from "express";
import { z } from "zod";
import { getNow } from "../helpers/clock.js";
import {
  cancelBooking,
  confirmBooking,
  holdSeats,
  listMyBookings,
} from "../services/bookingService.js";
import { releaseExpiredHolds } from "../services/holdService.js";

const holdSchema = z.object({
  eventId: z.number("eventId must be a number").int(),
  seatIds: z.array(z.number().int(), "seatIds must be a list of numbers"),
});

export async function createHold(req: Request, res: Response) {
  try {
    const input = holdSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: input.error.issues[0]?.message });
    }

    const { eventId, seatIds } = input.data;
    const booking = await holdSeats(req.user.userId, eventId, seatIds, getNow());
    return res.status(201).json({
      booking: {
        id: booking.id,
        status: booking.status,
        holdExpiresAt: booking.holdExpiresAt,
        seatIds,
      },
    });
  } catch (error) {
    console.log("createHold error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

export async function confirm(req: Request, res: Response) {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: "Booking id is not valid" });
    }

    const booking = await confirmBooking(req.user.userId, bookingId, getNow());
    return res.json({ booking: { id: booking.id, status: booking.status } });
  } catch (error) {
    console.log("confirm error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: "Booking id is not valid" });
    }

    const booking = await cancelBooking(req.user.userId, bookingId);
    return res.json({ booking: { id: booking.id, status: booking.status } });
  } catch (error) {
    console.log("cancel error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

export async function myBookings(req: Request, res: Response) {
  try {
    // free expired holds first, so history shows 'expired' on time
    await releaseExpiredHolds(getNow());

    const list = await listMyBookings(req.user.userId);
    return res.json({ bookings: list });
  } catch (error) {
    console.log("myBookings error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
