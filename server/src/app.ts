import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { checkDb } from "./config/db.js";
import { authRoutes } from "./routes/authRoutes.js";
import { bookingRoutes } from "./routes/bookingRoutes.js";
import { eventRoutes } from "./routes/eventRoutes.js";
import { settingsRoutes } from "./routes/settingsRoutes.js";

export const app = express();

// credentials: true lets the browser send and receive cookies.
// The origin must be the exact frontend address (not "*").
app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:3000", credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const version = await checkDb();
    res.json({ status: "ok", db: version });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

app.use("/auth", authRoutes);
app.use("/settings", settingsRoutes);
app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);
