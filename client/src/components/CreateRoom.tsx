import { useState } from "react";
import { socket } from "../socket/socket";

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

interface CreateRoomProps {
  username: string;
  onRoomCreated: (
    roomCode: string,
    room: RoomState
  ) => void;
}

export default function CreateRoom({
  username,
  onRoomCreated,
}: CreateRoomProps) {
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      alert("Please enter your username");
      return;
    }

    if (!socket.connected) {
      alert("Connecting to server. Please try again.");
      socket.connect();
      return;
    }

    setLoading(true);

    socket.emit(
      "create_room",
      { username: username.trim() },
      (response: {
        success: boolean;
        message?: string;
        room?: RoomState;
      }) => {
        setLoading(false);

        if (!response.success || !response.room) {
          alert(response.message || "Failed to create room");
          return;
        }

        sessionStorage.setItem(
          "syncplay_room_state",
          JSON.stringify(response.room)
        );

        onRoomCreated(
          response.room.roomCode,
          response.room
        );
      }
    );
  };

  return (
    <button
      onClick={handleCreateRoom}
      disabled={loading}
      style={{
        width: "100%",
        padding: "12px",
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Creating..." : "Create Room"}
    </button>
  );
}
