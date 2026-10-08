interface RoomInfoProps {
  roomCode: string;
}

export default function RoomInfo({
  roomCode,
}: RoomInfoProps) {
  return (
    <div
      style={{
        marginTop: "24px",
        padding: "16px",
        borderRadius: "10px",
        background: "#0f172a",
      }}
    >
      <h2>Room Created</h2>

      <p>
        Room Code: <strong>{roomCode}</strong>
      </p>

      <p>
        Share this code with your friends to join.
      </p>
    </div>
  );
}
