import cors from "cors";
import express from "express";
import { checkDb } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";

export const app = express();

app.use(cors());
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

// must stay LAST
app.use(errorHandler);
