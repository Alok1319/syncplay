import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import Home from "./pages/Home";
import Room from "./pages/Room";
import { socket } from "./socket/socket";

interface User { id: string; name: string; createdAt: string }
interface Participant { id: string; socketId: string; username: string; role: "HOST" | "MODERATOR" | "PARTICIPANT"; joinedAt: string }
interface RoomState { id: string; roomCode: string; hostId: string; createdAt: string; playbackState: { videoId: string; playbackState: "PLAYING" | "PAUSED"; currentTime: number; updatedAt: number }; participants: Participant[] }
const API_URL = import.meta.env.VITE_API_URL || "https://syncplay-server-lz9y.onrender.com";;

function AuthScreen({ onAuthenticated }: { onAuthenticated: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, password }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || "Authentication failed.");
      onAuthenticated(data.token, data.user);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not connect to the server. Check that the SyncPlay backend is running."); }
    finally { setBusy(false); }
  }
  const input: CSSProperties = { width: "100%", boxSizing: "border-box", padding: "13px 14px", marginTop: 7, borderRadius: 10, border: "1px solid rgba(255,255,255,.16)", background: "#201722", color: "white", outline: "none" };
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, color: "white", fontFamily: "Arial,sans-serif", background: "radial-gradient(ellipse at top left,rgba(244,63,94,.2),transparent 45%),linear-gradient(145deg,#100b12,#211321 60%,#100d14)" }}>
    <form onSubmit={submit} style={{ width: 390, maxWidth: "100%", boxSizing: "border-box", padding: 30, borderRadius: 20, background: "linear-gradient(145deg,#32182f,#51233f 55%,#392044)", border: "1px solid rgba(251,113,133,.3)", boxShadow: "0 24px 65px #0006" }}>
      <div style={{ fontSize: 12, letterSpacing: 3, color: "#fda4af", fontWeight: 700 }}>SYNCPLAY · WATCH TOGETHER</div><h1 style={{ fontSize: 32, margin: "12px 0 6px" }}>{mode === "register" ? "Create your account" : "Welcome back"}</h1><p style={{ color: "#e9cbdc", marginBottom: 24 }}>{mode === "register" ? "Create an account with your name and password to start a watch party." : "Sign in to continue to your watch parties."}</p>
      <label style={{ display: "block", marginBottom: 14, fontSize: 13 }}>Display name<input required minLength={2} maxLength={40} autoComplete="username" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={input}/></label>
      <label style={{ display: "block", marginBottom: 18, fontSize: 13 }}>Password<input required minLength={8} maxLength={72} type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={input}/></label>
      {error && <div role="alert" style={{ padding: 11, marginBottom: 14, borderRadius: 9, background: "#7f1d1d66", color: "#fecaca", fontSize: 13 }}>{error}</div>}
      <button disabled={busy} type="submit" style={{ width: "100%", padding: 14, border: 0, borderRadius: 10, color: "white", fontWeight: 700, background: "linear-gradient(90deg,#e11d48,#a855f7)", cursor: busy ? "wait" : "pointer" }}>{busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}</button>
      <p style={{ textAlign: "center", color: "#ead5e3", fontSize: 14, marginBottom: 0 }}>{mode === "register" ? "Already registered?" : "New to SyncPlay?"} <button type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }} style={{ border: 0, background: "none", color: "#fda4af", fontWeight: 700, cursor: "pointer" }}>{mode === "register" ? "Sign in" : "Create account"}</button></p>
    </form></main>;
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("syncplay_token"));
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [roomCode, setRoomCode] = useState<string | null>(null); const [initialRoom, setInitialRoom] = useState<RoomState | null>(null);
  useEffect(() => {
    let active = true;
    if (!token) { setChecking(false); return; }
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(async r => { const data = await r.json(); if (!r.ok || !data.success) throw new Error("Session expired"); if (active) setUser(data.user); }).catch(() => { localStorage.removeItem("syncplay_token"); if (active) { setToken(null); setUser(null); } }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [token]);
  useEffect(() => {
    if (!token || !user) return;
    socket.auth = { token }; if (!socket.connected) socket.connect();
    return () => { socket.disconnect(); };
  }, [token, user]);
  const handleAuthenticated = (newToken: string, newUser: User) => { localStorage.setItem("syncplay_token", newToken); setToken(newToken); setUser(newUser); };
  const handleLeave = () => { setRoomCode(null); setInitialRoom(null); sessionStorage.removeItem("syncplay_room_state"); };
  const logout = () => { socket.disconnect(); localStorage.removeItem("syncplay_token"); sessionStorage.removeItem("syncplay_room_state"); setRoomCode(null); setInitialRoom(null); setUser(null); setToken(null); };
  if (checking) return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#160f18", color: "white" }}>Loading SyncPlay…</main>;
  if (!token || !user) return <AuthScreen onAuthenticated={handleAuthenticated} />;
  if (roomCode && initialRoom) return <><div style={{ position: "fixed", zIndex: 1000, right: 16, top: 12, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 12, background: "#241724", color: "white", border: "1px solid #70415e" }}><span style={{ fontSize: 13 }}>{user.name}</span><button onClick={logout} style={{ background: "#9f1239", color: "white", border: 0, borderRadius: 7, padding: "7px 10px", cursor: "pointer" }}>Log out</button></div><Room roomCode={roomCode} initialRoom={initialRoom} onLeave={handleLeave} /></>;
  return <><div style={{ position: "fixed", zIndex: 1000, right: 16, top: 12, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 12, background: "#241724", color: "white", border: "1px solid #70415e" }}><span style={{ fontSize: 13 }}>{user.name}</span><button onClick={logout} style={{ background: "#9f1239", color: "white", border: 0, borderRadius: 7, padding: "7px 10px", cursor: "pointer" }}>Log out</button></div><Home initialName={user.name} onOpenRoom={(code, room) => { setRoomCode(code); setInitialRoom(room); }} /></>;
}
export default App;
