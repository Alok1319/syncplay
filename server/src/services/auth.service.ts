import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface AuthUser { id: string; name: string; passwordHash: string; createdAt: string }
const dataDir = path.resolve(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");
function readUsers(): AuthUser[] {
  try { if (!fs.existsSync(usersFile)) return []; return JSON.parse(fs.readFileSync(usersFile, "utf8")) as AuthUser[]; }
  catch { throw new Error("User storage could not be read"); }
}
function writeUsers(users: AuthUser[]): void {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = usersFile + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(users, null, 2), { mode: 0o600 });
  fs.renameSync(temp, usersFile);
}
function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in server/.env");
  return value;
}
export async function registerUser(name: string, password: string) {
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 40) throw new Error("Name must be 2–40 characters.");
  if (password.length < 8 || password.length > 72) throw new Error("Password must be 8–72 characters.");
  const jwtSecret = secret();
  const users = readUsers();
  if (users.some(u => u.name.toLowerCase() === cleanName.toLowerCase())) throw new Error("An account with this name already exists. Please sign in or choose another name.");
  const user: AuthUser = { id: crypto.randomUUID(), name: cleanName, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date().toISOString() };
  users.push(user); writeUsers(users);
  return { user: publicUser(user), token: jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: "7d", issuer: "syncplay" }) };
}
export async function loginUser(name: string, password: string) {
  const user = readUsers().find(u => u.name.toLowerCase() === name.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error("Invalid name or password.");
  return { user: publicUser(user), token: jwt.sign({ sub: user.id }, secret(), { expiresIn: "7d", issuer: "syncplay" }) };
}
export function verifyToken(token: string): { id: string; name: string } {
  const payload = jwt.verify(token, secret(), { issuer: "syncplay" }) as jwt.JwtPayload;
  if (typeof payload.sub !== "string") throw new Error("Invalid token");
  const user = readUsers().find(u => u.id === payload.sub);
  if (!user) throw new Error("User no longer exists");
  return publicUser(user);
}
export function getPublicUser(id: string) { const user = readUsers().find(u => u.id === id); return user ? publicUser(user) : null; }
function publicUser(user: AuthUser) { return { id: user.id, name: user.name, createdAt: user.createdAt }; }
