import type { Request, Response } from "express";
import { z } from "zod";
import { makeHttpError } from "../helpers/httpError.js";
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
  const { name, email, password } = registerSchema.parse(req.body);
  const user = await createUser(name, email, password);
  const token = makeToken({ userId: user.id, role: user.role });
  res.status(201).json({ user, token });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const user = await loginUser(email, password);
  const token = makeToken({ userId: user.id, role: user.role });
  res.json({ user, token });
}

export async function me(_req: Request, res: Response) {
  const user = await findUserById(res.locals.user.userId);
  if (!user) {
    throw makeHttpError(401, "Please log in");
  }
  res.json({ user });
}
