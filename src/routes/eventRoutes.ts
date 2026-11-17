import { Router } from "express";
import { addEvent, changeEvent, getEvent, getEvents } from "../controllers/eventController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const eventRoutes = Router();

// any logged-in user can look at events
eventRoutes.get("/", requireAuth, getEvents);
eventRoutes.get("/:id", requireAuth, getEvent);

// only organizers can create or change events
eventRoutes.post("/", requireAuth, requireRole("organizer"), addEvent);
eventRoutes.put("/:id", requireAuth, requireRole("organizer"), changeEvent);
