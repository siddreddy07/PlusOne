import { Router } from "express";
import { cancel, confirm, createHold, myBookings } from "../controllers/bookingController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const bookingRoutes = Router();

// every booking route is for logged-in attendees
bookingRoutes.use(requireAuth, requireRole("attendee"));

bookingRoutes.get("/mine", myBookings);
bookingRoutes.post("/hold", createHold);
bookingRoutes.post("/:id/confirm", confirm);
bookingRoutes.post("/:id/cancel", cancel);
