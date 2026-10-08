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

interface JoinRoomProps {
  username: string;
  onRoomJoined: (
    roomCode: string,
    room: RoomState
  ) => void;
}

export default function JoinRoom({
  username,
  onRoomJoined,
}: JoinRoomProps) {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoinRoom = () => {
    if (!username.trim()) {
      alert("Please enter your username");
      return;
    }

    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }

    if (!socket.connected) {
      alert("Connecting to server. Please try again.");
      socket.connect();
      return;
    }

    setLoading(true);

    socket.emit(
      "join_room",
      {
        username: username.trim(),
        roomCode: roomCode.trim().toUpperCase(),
      },
      (response: {
        success: boolean;
        message?: string;
        room?: RoomState;
      }) => {
        setLoading(false);

        if (!response.success || !response.room) {
          alert(response.message || "Failed to join room");
          return;
        }

        sessionStorage.setItem(
          "syncplay_room_state",
          JSON.stringify(response.room)
        );

        onRoomJoined(
          response.room.roomCode,
          response.room
        );
      }
    );
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Room code"
        value={roomCode}
        onChange={(event) =>
          setRoomCode(event.target.value.toUpperCase())
        }
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "12px",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleJoinRoom}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Joining..." : "Join Room"}
      </button>
    </div>
  );
}
