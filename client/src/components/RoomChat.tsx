import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { socket } from "../socket/socket";

type Message = {
  id: string;
  roomCode: string;
  username: string;
  text: string;
  createdAt: number;
};

type Reaction = {
  id: string;
  roomCode: string;
  username: string;
  emoji: string;
  createdAt: number;
};

type Props = {
  roomCode: string;
  username: string;
};

const EMOJIS = ["😂", "❤️", "🔥", "👏", "😮", "👍", "🎉", "😭"];

export default function RoomChat({ roomCode, username }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onMessage = (message: Message) => {
      if (message?.roomCode !== roomCode || !message.id) return;
      setMessages((previous) => [...previous, message].slice(-100));
    };

    const onReaction = (reaction: Reaction) => {
      if (reaction?.roomCode !== roomCode || !reaction.id) return;
      setReactions((previous) => [...previous, reaction].slice(-20));
      window.setTimeout(() => {
        setReactions((previous) =>
          previous.filter((item) => item.id !== reaction.id)
        );
      }, 5000);
    };

    const onError = (response: { message?: string }) => {
      setNotice(response?.message || "The action could not be completed.");
    };

    socket.on("chat_message", onMessage);
    socket.on("room_reaction", onReaction);
    socket.on("chat_error", onError);

    return () => {
      socket.off("chat_message", onMessage);
      socket.off("room_reaction", onReaction);
      socket.off("chat_error", onError);
    };
  }, [roomCode]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    socket.emit(
      "chat_send",
      { roomCode, text },
      (response: { success: boolean; message?: string }) => {
        if (response?.success) {
          setDraft("");
          setNotice("");
        } else {
          setNotice(response?.message || "Message could not be sent.");
        }
      }
    );
  }

  function sendReaction(emoji: string) {
    socket.emit(
      "reaction_send",
      { roomCode, emoji },
      (response: { success: boolean; message?: string }) => {
        if (response?.success) setNotice("");
        else setNotice(response?.message || "Reaction could not be sent.");
      }
    );
  }

  const panel: React.CSSProperties = {
    marginTop: 22,
    padding: 18,
    border: "1px solid #334155",
    borderRadius: 14,
    background: "#0f172a",
    color: "#e2e8f0",
  };

  return (
    <section aria-label="Room chat and reactions" style={panel}>
      <h2 style={{ marginTop: 0 }}>💬 Live Room Chat</h2>

      <div
        aria-live="polite"
        style={{
          height: 220,
          overflowY: "auto",
          padding: 12,
          borderRadius: 9,
          background: "#020617",
          border: "1px solid #334155",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#94a3b8" }}>No messages yet. Say hello!</p>
        )}

        {messages.map((message) => (
          <div key={message.id} style={{ marginBottom: 12, overflowWrap: "anywhere" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ color: message.username === username ? "#67e8f9" : "#c4b5fd" }}>
                {message.username}
              </strong>
              <time style={{ color: "#94a3b8", fontSize: 11 }}>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          aria-label="Chat message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          placeholder="Message everyone in this room..."
          style={{
            flex: 1,
            minWidth: 0,
            padding: 11,
            borderRadius: 8,
            border: "1px solid #475569",
            background: "#1e293b",
            color: "white",
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          style={{
            padding: "9px 16px",
            border: 0,
            borderRadius: 8,
            background: "#0891b2",
            color: "white",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>

      <h3 style={{ marginBottom: 8 }}>React to the moment</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Send ${emoji} reaction`}
            onClick={() => sendReaction(emoji)}
            style={{
              fontSize: 21,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #475569",
              background: "#1e293b",
              cursor: "pointer",
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {reactions.length > 0 && (
        <div aria-live="polite" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {reactions.map((reaction) => (
            <span
              key={reaction.id}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 20,
                padding: "6px 10px",
              }}
            >
              {reaction.emoji} <small>{reaction.username}</small>
            </span>
          ))}
        </div>
      )}

      {notice && (
        <p role="status" style={{ color: "#fca5a5" }}>{notice}</p>
      )}
    </section>
  );
}