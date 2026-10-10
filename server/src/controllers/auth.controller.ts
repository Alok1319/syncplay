import type { Request, Response } from "express";
import { getPublicUser, loginUser, registerUser } from "../services/auth.service.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

export async function register(req: Request, res: Response) {
  try {
    const { name, password } = req.body ?? {};
    if (typeof name !== "string" || typeof password !== "string") return res.status(400).json({ success: false, message: "Name and password are required." });
    const result = await registerUser(name, password);
    res.status(201).json({ success: true, ...result });
  } catch (error) { const message = error instanceof Error ? error.message : "Registration failed."; const status = /already exists/i.test(message) ? 409 : /JWT_SECRET/.test(message) ? 500 : 400; res.status(status).json({ success: false, message }); }
}
export async function login(req: Request, res: Response) {
  try {
    const { name, password } = req.body ?? {};
    if (typeof name !== "string" || typeof password !== "string") return res.status(400).json({ success: false, message: "Name and password are required." });
    res.json({ success: true, ...(await loginUser(name, password)) });
  } catch (error) { const message = error instanceof Error ? error.message : "Login failed."; res.status(/JWT_SECRET/.test(message) ? 500 : 401).json({ success: false, message }); }
}
export function me(req: AuthRequest, res: Response) { const user = req.user ? getPublicUser(req.user.id) : null; if (!user) return res.status(401).json({ success: false, message: "Please sign in again." }); return res.json({ success: true, user }); }
