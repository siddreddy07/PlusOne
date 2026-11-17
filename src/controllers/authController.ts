import type { Request, Response } from "express";
import { z } from "zod";
import { makeToken } from "../helpers/token.js";
import { createUser, findUserById, loginUser } from "../services/authService.js";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Email is not valid").transform((email) => email.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.email("Email is not valid").transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export async function register(req: Request, res: Response) {
  try {
    // 1. check the input
    const input = registerSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: input.error.issues[0]?.message });
    }

    // 2. do the work (the service throws an Error if something is wrong)
    const { name, email, password } = input.data;
    const user = await createUser(name, email, password);
    const token = makeToken({ userId: user.id, role: user.role });
    return res.status(201).json({ user, token });
  } catch (error) {
    console.log("register error:", error.message);
    return res.status(409).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const input = loginSchema.safeParse(req.body);
    if (!input.success) {
      return res.status(400).json({ error: input.error.issues[0]?.message });
    }

    const { email, password } = input.data;
    const user = await loginUser(email, password);
    const token = makeToken({ userId: user.id, role: user.role });
    return res.json({ user, token });
  } catch (error) {
    console.log("login error:", error.message);
    return res.status(401).json({ error: error.message });
  }
}

export async function me(req: Request, res: Response) {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(401).json({ error: "Please log in" });
    }
    return res.json({ user });
  } catch (error) {
    console.log("me error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
