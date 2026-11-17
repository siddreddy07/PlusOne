import type { Request, Response } from "express";
import { z } from "zod";
import { getAllSettings, updateSetting } from "../services/settingsService.js";

const updateSchema = z.object({
  value: z.number("Value must be a number"),
});

export async function getSettings(_req: Request, res: Response) {
  try {
    const allSettings = await getAllSettings();
    return res.json({ settings: allSettings });
  } catch (error) {
    console.log("getSettings error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

export async function changeSetting(req: Request, res: Response) {
  try {
    const input = updateSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: input.error.issues[0]?.message });
    }

    const key = String(req.params.key);
    await updateSetting(key, input.data.value);
    return res.json({ key, value: input.data.value });
  } catch (error) {
    console.log("changeSetting error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}
