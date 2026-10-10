# SyncPlay authentication setup

## What was added
- Email/password registration and login API at `/api/auth/register` and `/api/auth/login`.
- Passwords are hashed with bcryptjs; plain-text passwords are never written to disk.
- `GET /api/auth/me` validates a Bearer token.
- React login/register screen and persistent browser token; logout clears the local session.
- Socket.IO handshake verifies the JWT. The server uses the signed-in account name for room creation/joining instead of trusting the submitted username.
- MVP account storage uses `server/data/users.json` so no database service is needed in the one-hour window. This is not ideal for horizontally scaled production deployments; migrate to PostgreSQL before a production launch.

## Required one-time setup (PowerShell)
From the project folder:

```powershell
cd .\server
$secret = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
@("PORT=5000", "FRONTEND_URL=http://localhost:5173,http://localhost:5174", "JWT_SECRET=$secret") | Set-Content .env
npm.cmd install
npm.cmd run build
```

Then in another terminal:

```powershell
cd "C:\Users\ALOK MISHRA\Desktop\syncplay\client"
npm.cmd install
npm.cmd run build
```

Run the server with `npm.cmd run dev` from `server`, and the frontend with `npm.cmd run dev` from `client`.

For a separate production frontend/backend, set `FRONTEND_URL` on the server to the exact frontend origin and `VITE_API_URL` and `VITE_SOCKET_URL` on the client to the backend URL, then rebuild the client. Do not commit `server/.env` or `server/data/users.json`.

## Smoke test
1. Register an account with a valid email and password of at least 8 characters.
2. Log out, then log back in.
3. Try a wrong password and confirm it is rejected.
4. Open another browser session, register/sign in, and test create/join room and synchronized playback.

The build commands above must pass before submission. Socket authentication is enforced, so any old manually-created client connection without a token will be rejected by design.
