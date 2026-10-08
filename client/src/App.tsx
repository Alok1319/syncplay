import { useState } from "react";
import Home from "./pages/Home";
import Room from "./pages/Room";

interface Participant {
  id: string;
  socketId: string;
  username: string;
  role: "HOST" | "MODERATOR" | "PARTICIPANT";
  joinedAt: string;
}

interface RoomState {
  id: string;
  roomCode: string;
  hostId: string;
  createdAt: string;
  playbackState: {
    videoId: string;
    playbackState: "PLAYING" | "PAUSED";
    currentTime: number;
    updatedAt: number;
  };
  participants: Participant[];
}

function App() {
  const [roomCode, setRoomCode] =
    useState<string | null>(null);

  const [initialRoom, setInitialRoom] =
    useState<RoomState | null>(null);

  const handleOpenRoom = (
    code: string,
    room: RoomState
  ) => {
    setRoomCode(code);
    setInitialRoom(room);
  };

  const handleLeave = () => {
    setRoomCode(null);
    setInitialRoom(null);

    sessionStorage.removeItem(
      "syncplay_room_state"
    );
  };

  if (roomCode && initialRoom) {
    return (
      <Room
        roomCode={roomCode}
        initialRoom={initialRoom}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <Home onOpenRoom={handleOpenRoom} />
  );
}

export default App;
