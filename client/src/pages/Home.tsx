import { useState } from "react";
import CreateRoom from "../components/CreateRoom";
import JoinRoom from "../components/JoinRoom";
import RoomInfo from "../components/RoomInfo";

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

interface HomeProps {
  initialName?: string;
  onOpenRoom: (
    roomCode: string,
    room: RoomState
  ) => void;
}

export default function Home({
  onOpenRoom,
  initialName = "",
}: HomeProps) {
  const [username, setUsername] = useState(initialName);
  const [roomCode, setRoomCode] = useState("");

  const handleRoomCreated = (
    code: string,
    room: RoomState
  ) => {
    setRoomCode(code);

    sessionStorage.setItem(
      "syncplay_username",
      username.trim()
    );

    onOpenRoom(code, room);
  };

  const handleRoomJoined = (
    code: string,
    room: RoomState
  ) => {
    setRoomCode(code);

    sessionStorage.setItem(
      "syncplay_username",
      username.trim()
    );

    onOpenRoom(code, room);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "radial-gradient(ellipse at top left, rgba(244,63,94,0.16), transparent 45%), linear-gradient(145deg, #100b12, #1b101c 55%, #100d14)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "20px",
      }}
    >
      <section
        style={{
          width: "420px",
          maxWidth: "100%",
          padding: "32px",
          background: "linear-gradient(145deg, #32182f 0%, #51233f 52%, #392044 100%)",
          borderRadius: "20px", border: "1px solid rgba(251,113,133,0.28)", boxShadow: "0 24px 65px rgba(0,0,0,0.32)",
        }}
      >
        <h1>SyncPlay</h1>
        <p>Watch YouTube videos together in real time.</p>

        <input
          type="text"
          placeholder="Your username"
          value={username}
          onChange={(event) =>
            setUsername(event.target.value)
          }
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "16px",
            boxSizing: "border-box",
          }}
        />

        <CreateRoom
          username={username}
          onRoomCreated={handleRoomCreated}
        />

        <hr style={{ margin: "24px 0" }} />

        <JoinRoom
          username={username}
          onRoomJoined={handleRoomJoined}
        />

        {roomCode && <RoomInfo roomCode={roomCode} />}
      </section>
    </main>
  );
}
