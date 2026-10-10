# SyncPlay name + password authentication

This version uses **display name + password** for registration and sign-in. Email is not requested or stored. Passwords are bcrypt-hashed; sessions use JWT.

## Run locally

Create `server/.env` with `PORT=5000`, `FRONTEND_URL=http://localhost:5173,http://localhost:5174,http://localhost:5175`, and a random `JWT_SECRET` of at least 32 characters. Then run `npm.cmd install` and `npm.cmd run dev` from `server`, and `npm.cmd install` and `npm.cmd run dev` from `client`.

User records are stored in `server/data/users.json` for this local demonstration. This file-based storage is not intended for production or concurrent multi-instance deployment. Existing email-based account records are not compatible with this name/password version; back up and remove `server/data/users.json` only if you are okay losing test accounts.
