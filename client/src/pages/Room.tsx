import { useEffect, useState } from "react";
import YouTubePlayer from "../components/YouTubePlayer";
import { socket } from "../socket/socket";

import RoomChat from "../components/RoomChat";
import "../syncplay-theme.css";
type ParticipantRole =
  | "HOST"
  | "MODERATOR"
  | "PARTICIPANT";

interface Participant {
  id: string;
  socketId: string;
  username: string;
  role: ParticipantRole;
  joinedAt: string;
}

interface PlaybackState {
  videoId: string;
  playbackState: "PLAYING" | "PAUSED";
  currentTime: number;
  updatedAt: number;
}

interface RoomState {
  id: string;
  roomCode: string;
  hostId: string;
  createdAt: string;
  playbackState: PlaybackState;
  participants: Participant[];
}

interface RoomProps {
  roomCode: string;
  initialRoom: RoomState;
  onLeave?: () => void;
}

type PlaybackRequestAction = "PLAY" | "PAUSE" | "SEEK";

interface PlaybackRequest {
  id: string;
  roomCode: string;
  participantId: string;
  username: string;
  action: PlaybackRequestAction;
  currentTime: number;
  createdAt: number;
}

function getYoutubeVideoId(
  value: string
): string | null {
  const input = value.trim();

  if (!input) {
    return null;
  }

  if (
    /^[a-zA-Z0-9_-]{11}$/.test(input)
  ) {
    return input;
  }

  try {
    const url = new URL(input);

    if (url.hostname === "youtu.be") {
      return (
        url.pathname
          .replace("/", "")
          .slice(0, 11) || null
      );
    }

    if (
      url.hostname.includes(
        "youtube.com"
      )
    ) {
      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
}

export default function Room({
  roomCode,
  initialRoom,
  onLeave,
}: RoomProps) {
  const [room, setRoom] =
    useState<RoomState>(initialRoom);

  const [videoInput, setVideoInput] =
    useState("");

  const [error, setError] =
    useState("");

  const [playbackRequests, setPlaybackRequests] =
    useState<PlaybackRequest[]>([]);

  const [requestSeekTime, setRequestSeekTime] =
    useState("10");

  const [requestMessage, setRequestMessage] =
    useState("");

  const currentParticipant =
    room.participants.find(
      (participant) =>
        participant.socketId === socket.id
    );

  const isHost =
    currentParticipant?.role === "HOST";

  const canControl =
    currentParticipant?.role ===
      "HOST" ||
    currentParticipant?.role ===
      "MODERATOR";

  useEffect(() => {
    setRoom(initialRoom);
  }, [initialRoom]);

  useEffect(() => {
    const handleUserJoined = (payload: any) => {
      setRoom((current) => {
        // Some server events include the full participant list.
        if (Array.isArray(payload?.participants)) {
          return {
            ...current,
            participants: payload.participants,
          };
        }

        // Other events send only the newly joined participant.
        const participant =
          payload?.participant ?? payload;

        if (
          !participant ||
          typeof participant !== "object"
        ) {
          return current;
        }

        if (
          !participant.id ||
          !participant.username ||
          !participant.role
        ) {
          return current;
        }

        const exists = current.participants.some(
          (item) => item.id === participant.id
        );

        if (exists) {
          return current;
        }

        return {
          ...current,
          participants: [
            ...current.participants,
            participant,
          ],
        };
      });
    };

    const handleUserLeft = ({
      participantId,
    }: {
      participantId: string;
    }) => {
      setRoom((current) => ({
        ...current,
        participants:
          current.participants.filter(
            (participant) =>
              participant.id !==
              participantId
          ),
      }));
    };

    const handleRoleAssigned = ({
      participantId,
      role,
    }: {
      participantId: string;
      role: ParticipantRole;
    }) => {
      setRoom((current) => ({
        ...current,
        participants:
          current.participants.map(
            (participant) =>
              participant.id ===
              participantId
                ? {
                    ...participant,
                    role,
                  }
                : participant
          ),
      }));
    };

    const handleParticipantRemoved = ({
      participantId,
    }: {
      participantId: string;
    }) => {
      if (
        participantId ===
        currentParticipant?.id
      ) {
        setError(
          "You have been removed from this room."
        );
        onLeave?.();
        return;
      }

      setRoom((current) => ({
        ...current,
        participants:
          current.participants.filter(
            (participant) =>
              participant.id !==
              participantId
          ),
      }));
    };

    const handlePlay = ({
      currentTime,
    }: {
      currentTime: number;
    }) => {
      setRoom((current) => ({
        ...current,
        playbackState: {
          ...current.playbackState,
          playbackState: "PLAYING",
          currentTime,
          updatedAt: Date.now(),
        },
      }));
    };

    const handlePause = ({
      currentTime,
    }: {
      currentTime: number;
    }) => {
      setRoom((current) => ({
        ...current,
        playbackState: {
          ...current.playbackState,
          playbackState: "PAUSED",
          currentTime,
          updatedAt: Date.now(),
        },
      }));
    };

    const handleSeek = ({
      currentTime,
    }: {
      currentTime: number;
    }) => {
      setRoom((current) => ({
        ...current,
        playbackState: {
          ...current.playbackState,
          currentTime,
          updatedAt: Date.now(),
        },
      }));
    };

    const handleChangeVideo = ({
      videoId,
    }: {
      videoId: string;
    }) => {
      setRoom((current) => ({
        ...current,
        playbackState: {
          videoId,
          playbackState: "PAUSED",
          currentTime: 0,
          updatedAt: Date.now(),
        },
      }));
    };

    socket.on(
      "user_joined",
      handleUserJoined
    );

    socket.on(
      "user_left",
      handleUserLeft
    );

    socket.on(
      "role_assigned",
      handleRoleAssigned
    );

    socket.on(
      "participant_removed",
      handleParticipantRemoved
    );

    const handlePlaybackRequestCreated = (request: PlaybackRequest) => {
      setPlaybackRequests((current) => {
        if (current.some((item) => item.id === request.id)) {
          return current;
        }
        return [...current, request].sort((a, b) => a.createdAt - b.createdAt);
      });
    };

    const handlePlaybackRequestResolved = ({
      requestId,
      status,
      resolvedBy,
    }: {
      requestId: string;
      status: "APPROVED" | "REJECTED";
      resolvedBy: string;
    }) => {
      setPlaybackRequests((current) =>
        current.filter((request) => request.id !== requestId)
      );
      setRequestMessage(`Playback request ${status.toLowerCase()} by ${resolvedBy}.`);
    };

    socket.on("playback_request_created", handlePlaybackRequestCreated);
    socket.on("playback_request_resolved", handlePlaybackRequestResolved);

    socket.on("play", handlePlay);
    socket.on("pause", handlePause);
    socket.on("seek", handleSeek);

    socket.on(
      "change_video",
      handleChangeVideo
    );

    return () => {
      socket.off(
        "user_joined",
        handleUserJoined
      );

      socket.off(
        "user_left",
        handleUserLeft
      );

      socket.off(
        "role_assigned",
        handleRoleAssigned
      );

      socket.off(
        "participant_removed",
        handleParticipantRemoved
      );

      socket.off("playback_request_created", handlePlaybackRequestCreated);
      socket.off("playback_request_resolved", handlePlaybackRequestResolved);

      socket.off("play", handlePlay);
      socket.off("pause", handlePause);
      socket.off("seek", handleSeek);

      socket.off(
        "change_video",
        handleChangeVideo
      );
    };
  }, []);

  const handlePlay = (
    currentTime: number
  ) => {
    if (!canControl) {
      return;
    }

    socket.emit(
      "play",
      { currentTime },
      (
        response: {
          success: boolean;
          message?: string;
        }
      ) => {
        if (!response.success) {
          setError(
            response.message ||
              "Unable to play video."
          );
        }
      }
    );
  };

  const handlePause = (
    currentTime: number
  ) => {
    if (!canControl) {
      return;
    }

    socket.emit(
      "pause",
      { currentTime },
      (
        response: {
          success: boolean;
          message?: string;
        }
      ) => {
        if (!response.success) {
          setError(
            response.message ||
              "Unable to pause video."
          );
        }
      }
    );
  };

  const handleSeek = (
    currentTime: number
  ) => {
    if (!canControl) {
      return;
    }

    socket.emit(
      "seek",
      { currentTime },
      (
        response: {
          success: boolean;
          message?: string;
        }
      ) => {
        if (!response.success) {
          setError(
            response.message ||
              "Unable to seek video."
          );
        }
      }
    );
  };

  const handleRequestPlaybackAction = (
    action: PlaybackRequestAction,
    currentTime = room.playbackState.currentTime
  ) => {
    if (canControl) {
      setRequestMessage("You can control playback directly.");
      return;
    }

    setError("");
    setRequestMessage("");

    socket.emit(
      "request_playback_action",
      { action, currentTime },
      (response: { success: boolean; message?: string }) => {
        if (!response?.success) {
          setRequestMessage(response?.message || "Unable to send playback request.");
          return;
        }
        setRequestMessage("Request sent. Waiting for the Host or Moderator.");
      }
    );
  };

  const handleResolvePlaybackRequest = (
    requestId: string,
    approve: boolean
  ) => {
    if (!canControl) {
      return;
    }

    socket.emit(
      "resolve_playback_request",
      { requestId, approve },
      (response: { success: boolean; message?: string }) => {
        if (!response?.success) {
          setError(response?.message || "Unable to resolve playback request.");
        }
      }
    );
  };

  const handleChangeVideo = () => {
    if (!canControl) {
      return;
    }

    const videoId =
      getYoutubeVideoId(videoInput);

    if (!videoId) {
      setError(
        "Enter a valid YouTube URL or video ID."
      );
      return;
    }

    socket.emit(
      "change_video",
      { videoId },
      (
        response: {
          success: boolean;
          message?: string;
        }
      ) => {
        if (!response.success) {
          setError(
            response.message ||
              "Unable to change video."
          );
          return;
        }

        setVideoInput("");
      }
    );
  };

  const handleAssignModerator = (
    participantId: string
  ) => {
    if (!isHost) {
      return;
    }

    socket.emit(
      "assign_role",
      {
        participantId,
        role: "MODERATOR",
      },
      (
        response: {
          success: boolean;
          message?: string;
        }
      ) => {
        if (!response.success) {
          setError(
            response.message ||
              "Unable to assign moderator."
          );
        }
      }
    );
  };

  const handleRemoveParticipant = (
    participantId: string
  ) => {
    if (!isHost) {
      return;
    }

    socket.emit(
      "remove_participant",
      { participantId },
      (
        response: {
          success: boolean;
          message?: string;
        }
      ) => {
        if (!response.success) {
          setError(
            response.message ||
              "Unable to remove participant."
          );
        }
      }
    );
  };

  const handleLeave = () => {
    socket.emit(
      "leave_room",
      (
        response: {
          success: boolean;
          message?: string;
        }
      ) => {
        if (!response.success) {
          setError(
            response.message ||
              "Unable to leave room."
          );
        }

        onLeave?.();
      }
    );
  };

  return (
    <main className="syncplay-room"
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
              }}
            >
              SyncPlay
            </h1>

            <p
              style={{
                margin:
                  "6px 0 0",
                color: "#94a3b8",
              }}
            >
              Room:{" "}
              <strong
                style={{
                  color: "#38bdf8",
                  letterSpacing: "2px",
                }}
              >
                {room.roomCode ||
                  roomCode}
              </strong>
            </p>
          </div>

          <button
            onClick={handleLeave}
            style={{
              padding:
                "10px 18px",
              border:
                "1px solid #475569",
              borderRadius: "8px",
              background:
                "#0f172a",
              color: "white",
              cursor:
                "pointer",
            }}
          >
            Leave Room
          </button>
        </header>

        {error && (
          <div
            style={{
              marginBottom:
                "18px",
              padding:
                "12px 16px",
              borderRadius: "8px",
              background:
                "#451a1a",
              color:
                "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        <div className="room-layout"
          style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: "24px" }}
        >
          <section>
            <div
              style={{
                marginBottom:
                  "18px",
                padding: "16px",
                background:
                  "#0f172a",
                borderRadius:
                  "12px",
                border:
                  "1px solid #1e293b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
                <input
                  value={videoInput}
                  onChange={(
                    event
                  ) =>
                    setVideoInput(
                      event.target
                        .value
                    )
                  }
                  placeholder="Paste YouTube URL or video ID"
                  disabled={
                    !canControl
                  }
                  style={{
                    flex: 1,
                    padding:
                      "12px",
                    borderRadius:
                      "8px",
                    border:
                      "1px solid #334155",
                    background:
                      "#020617",
                    color:
                      "white",
                    outline:
                      "none",
                  }}
                />

                <button
                  onClick={
                    handleChangeVideo
                  }
                  disabled={
                    !canControl
                  }
                  style={{
                    padding:
                      "12px 18px",
                    border: "none",
                    borderRadius:
                      "8px",
                    background:
                      canControl
                        ? "#38bdf8"
                        : "#334155",
                    color:
                      "#020617",
                    fontWeight:
                      700,
                    cursor:
                      canControl
                        ? "pointer"
                        : "not-allowed",
                  }}
                >
                  Change Video
                </button>
              </div>

              {!canControl && (
                <p
                  style={{
                    marginBottom:
                      0,
                    color:
                      "#94a3b8",
                    fontSize:
                      "14px",
                  }}
                >
                  Only the Host or
                  Moderator can
                  control playback.
                </p>
              )}
            </div>

            {room.playbackState
              .videoId ? (
              <YouTubePlayer
                key={canControl ? "controller" : "viewer"}
                videoId={room.playbackState.videoId}
                canControl={canControl}
                playbackState={room.playbackState.playbackState}
                currentTime={room.playbackState.currentTime}
                updatedAt={room.playbackState.updatedAt}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
              />
            ) : (
              <div
                style={{
                  aspectRatio:
                    "16 / 9",
                  background:
                    "#0f172a",
                  borderRadius:
                    "14px",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  color:
                    "#64748b",
                  border:
                    "1px solid #1e293b",
                }}
              >
                <div
                  style={{
                    textAlign:
                      "center",
                  }}
                >
                  <h2>
                    No video selected
                  </h2>

                  <p>
                    {canControl
                      ? "Paste a YouTube URL above to start watching."
                      : "Waiting for the Host to select a video."}
                  </p>
                </div>
              </div>
            )}

            <div
              style={{
                marginTop:
                  "16px",
                padding:
                  "16px",
                background:
                  "#0f172a",
                borderRadius:
                  "12px",
              }}
            >
              <strong>
                Your role:{" "}
                {currentParticipant?.role ||
                  "UNKNOWN"}
              </strong>

              <p
                style={{
                  marginBottom:
                    0,
                  color:
                    "#94a3b8",
                }}
              >
                Playback:{" "}
                {
                  room
                    .playbackState
                    .playbackState
                }
              </p>
            </div>

            {!canControl && room.playbackState.videoId && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: "8px" }}>
                  Request Playback Control
                </h3>
                <p style={{ color: "#94a3b8", marginTop: 0, fontSize: "14px" }}>
                  Ask the Host or a Moderator to approve a playback action.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <button
                    onClick={() => handleRequestPlaybackAction("PLAY")}
                    style={{ padding: "9px 12px", border: 0, borderRadius: "7px", background: "#0e7490", color: "white", cursor: "pointer" }}
                  >
                    Request Play
                  </button>
                  <button
                    onClick={() => handleRequestPlaybackAction("PAUSE")}
                    style={{ padding: "9px 12px", border: 0, borderRadius: "7px", background: "#334155", color: "white", cursor: "pointer" }}
                  >
                    Request Pause
                  </button>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={requestSeekTime}
                    onChange={(event) => setRequestSeekTime(event.target.value)}
                    aria-label="Requested seek position in seconds"
                    style={{ width: "110px", padding: "9px", borderRadius: "7px", border: "1px solid #475569", background: "#020617", color: "white" }}
                  />
                  <button
                    onClick={() => {
                      const seconds = Number(requestSeekTime);
                      if (!Number.isFinite(seconds) || seconds < 0) {
                        setRequestMessage("Enter a valid seek position.");
                        return;
                      }
                      handleRequestPlaybackAction("SEEK", seconds);
                    }}
                    style={{ padding: "9px 12px", border: 0, borderRadius: "7px", background: "#7c3aed", color: "white", cursor: "pointer" }}
                  >
                    Request Seek
                  </button>
                </div>
                {requestMessage && (
                  <p role="status" style={{ color: "#bae6fd", marginBottom: 0 }}>
                    {requestMessage}
                  </p>
                )}
              </div>
            )}
          </section>

          <aside className="room-sidebar"
            style={{
              background:
                "#0f172a",
              borderRadius:
                "14px",
              padding:
                "18px",
              height: "100%",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              Participants
            </h2>

            {room.participants.map(
              (
                participant
              ) => (
                <div
                  key={
                    participant.id
                  }
                  style={{
                    padding:
                      "12px 0",
                    borderBottom:
                      "1px solid #1e293b",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap:
                        "8px",
                    }}
                  >
                    <strong>
                      {
                        participant.username
                      }
                    </strong>

                    <span
                      style={{
                        fontSize:
                          "12px",
                        padding:
                          "4px 7px",
                        borderRadius:
                          "999px",
                        background:
                          participant.role ===
                          "HOST"
                            ? "#7c2d12"
                            : participant.role ===
                              "MODERATOR"
                            ? "#164e63"
                            : "#1e293b",
                      }}
                    >
                      {
                        participant.role
                      }
                    </span>
                  </div>

                  {isHost &&
                    participant.id !==
                      currentParticipant?.id &&
                    participant.role ===
                      "PARTICIPANT" && (
                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "8px",
                          marginTop:
                            "10px",
                        }}
                      >
                        <button
                          onClick={() =>
                            handleAssignModerator(
                              participant.id
                            )
                          }
                          style={{
                            flex: 1,
                            padding:
                              "8px",
                            border:
                              "none",
                            borderRadius:
                              "6px",
                            background:
                              "#0891b2",
                            color:
                              "white",
                            cursor:
                              "pointer",
                          }}
                        >
                          Make Moderator
                        </button>

                        <button
                          onClick={() =>
                            handleRemoveParticipant(
                              participant.id
                            )
                          }
                          style={{
                            padding:
                              "8px 10px",
                            border:
                              "1px solid #7f1d1d",
                            borderRadius:
                              "6px",
                            background:
                              "transparent",
                            color:
                              "#fca5a5",
                            cursor:
                              "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                </div>
              )
            )}

            {canControl && (
              <div style={{ marginTop: "22px", borderTop: "1px solid #334155", paddingTop: "16px" }}>
                <h3 style={{ marginTop: 0 }}>Playback Requests</h3>
                {playbackRequests.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "14px" }}>
                    No pending requests.
                  </p>
                ) : (
                  playbackRequests.map((request) => (
                    <div
                      key={request.id}
                      style={{ padding: "12px 0", borderBottom: "1px solid #334155" }}
                    >
                      <strong>{request.username}</strong>
                      <p style={{ margin: "6px 0 10px", color: "#cbd5e1", fontSize: "14px" }}>
                        {request.action === "SEEK"
                          ? `requests seek to ${request.currentTime}s`
                          : `requests ${request.action.toLowerCase()}`}
                      </p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleResolvePlaybackRequest(request.id, true)}
                          style={{ flex: 1, padding: "8px", border: 0, borderRadius: "6px", background: "#15803d", color: "white", cursor: "pointer" }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleResolvePlaybackRequest(request.id, false)}
                          style={{ flex: 1, padding: "8px", border: "1px solid #7f1d1d", borderRadius: "6px", background: "transparent", color: "#fca5a5", cursor: "pointer" }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
                {requestMessage && (
                  <p role="status" style={{ color: "#bae6fd", fontSize: "13px" }}>
                    {requestMessage}
                  </p>
                )}
              </div>
            )}


            <div style={{ marginTop: 20, borderTop: '1px solid #334155', paddingTop: 18 }}>
<RoomChat
          roomCode={room.roomCode || roomCode}
          username={currentParticipant?.username ?? "Guest"}
        />
            </div>
          </aside>
        </div>
      </div></main>
  );
}
