import { Router } from "express";
import { changeSetting, getSettings } from "../controllers/settingsController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const settingsRoutes = Router();

// any logged-in user can read
settingsRoutes.get("/", requireAuth, getSettings);

// only organizers can change
settingsRoutes.put("/:key", requireAuth, requireRole("organizer"), changeSetting);
