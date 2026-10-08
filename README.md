# SyncPlay — Real-Time YouTube Watch Party

SyncPlay is a full-stack web application that allows users to watch YouTube videos together in a shared room. Playback events are synchronized in real time, with role-based permissions and playback-control requests.

## Features

- Create and join watch-party rooms.
- Share a room code with other participants.
- Real-time synchronized YouTube playback.
- Host, Moderator, and Participant roles.
- Host can promote participants to Moderator and remove participants.
- Hosts and Moderators can control playback.
- Participants can request play, pause, and seek actions.
- Hosts and Moderators can approve or reject playback requests.
- React and TypeScript frontend.
- Node.js, Express, TypeScript, and Socket.IO backend.

## Technology Stack

**Frontend:** React, TypeScript, Vite, YouTube IFrame Player API  
**Backend:** Node.js, Express, TypeScript, Socket.IO  
**Communication:** WebSockets through Socket.IO

## Project Structure

```text
syncplay/
├── client/       # React frontend
├── server/       # Node.js backend
└── README.md     # Project documentation
```

## Prerequisites

- Node.js and npm installed.
- A modern web browser.
- Internet access for YouTube playback.

## Installation

Clone the repository or download the project source, then open a terminal in the project root.

### 1. Install frontend dependencies

```bash
cd client
npm install
```

### 2. Install backend dependencies

Open another terminal from the project root:

```bash
cd server
npm install
```

## Running Locally

### Start the backend

From the project root:

```bash
cd server
npm run dev
```

### Start the frontend

In a second terminal:

```bash
cd client
npm run dev
```

Open the local URL printed by Vite in your browser.

Keep both terminals running while using the application.

## How It Works

1. A user creates a room and becomes its Host.
2. Other users join the room and receive a role.
3. Socket.IO communicates room and playback events in real time.
4. The YouTube player applies synchronized playback updates.
5. The backend validates playback permissions before accepting control actions.
6. Participants can request playback actions; authorized users can approve or reject them.

## Roles and Permissions

| Action | Host | Moderator | Participant |
|---|---|---|---|
| Control playback | Yes | Yes | By approved request |
| Approve or reject playback requests | Yes | Yes | No |
| Promote a participant to Moderator | Yes | No | No |
| Remove a participant | Yes | No | No |

## Architecture Overview

The application has two main parts:

- **Client:** React UI, YouTube player, room interface, and Socket.IO client.
- **Server:** Express application, Socket.IO event handlers, room management, participant roles, and playback permission validation.

The backend is responsible for enforcing playback permissions so that unauthorized clients cannot directly control shared playback.

## Deployment

**Live application:** Add your deployed frontend URL here.  
**Backend URL:** Add your deployed backend URL here.

The application is not considered publicly deployed until the frontend and backend are deployed and successfully communicate with each other.

## Future Improvements

Potential extensions include chat, reactions, authentication, persistent room storage, and host transfer.

## Author

Developed as a full-stack engineering assignment.
