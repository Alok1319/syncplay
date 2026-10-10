import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth.service.js";
export interface AuthRequest extends Request { user?: { id: string; name: string } }
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization"); const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ success: false, message: "Authentication required." });
  try { req.user = verifyToken(token); next(); }
  catch { return res.status(401).json({ success: false, message: "Invalid or expired session. Please sign in again." }); }
}
