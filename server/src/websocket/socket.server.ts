import crypto from "crypto";
import { Server, Socket } from "socket.io";
import { roomManager } from "../classes/RoomManager.js";
import { Participant } from "../classes/Participant.js";

interface CreateRoomPayload {
  username: string;
  initialVideoId?: string;
}

interface JoinRoomPayload {
  roomCode: string;
  username: string;
}

interface PlaybackPayload {
  currentTime: number;
}

type PlaybackRequestAction = "PLAY" | "PAUSE" | "SEEK";

interface RequestPlaybackActionPayload {
  action: PlaybackRequestAction;
  currentTime: number;
}

interface ResolvePlaybackRequestPayload {
  requestId: string;
  approve: boolean;
}

interface PendingPlaybackRequest {
  id: string;
  roomCode: string;
  participantId: string;
  username: string;
  action: PlaybackRequestAction;
  currentTime: number;
  createdAt: number;
}

const pendingPlaybackRequests = new Map<string, PendingPlaybackRequest>();

interface SeekPayload {
  currentTime: number;
}

interface ChangeVideoPayload {
  videoId: string;
}

interface RolePayload {
  participantId: string;
  role: "HOST" | "MODERATOR" | "PARTICIPANT";
}

interface RemoveParticipantPayload {
  participantId: string;
}

export function setupSocketServer(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    /*
     * CREATE ROOM
     */
    socket.on(
      "create_room",
      (payload: CreateRoomPayload, callback) => {
        try {
          if (!payload?.username?.trim()) {
            callback?.({
              success: false,
              message: "Username is required",
            });
            return;
          }

          const participantId = crypto.randomUUID();

          const room = roomManager.createRoom(
            participantId,
            socket.id,
            payload.username.trim(),
            payload.initialVideoId || ""
          );

          socket.join(room.roomCode);

          socket.data.roomCode = room.roomCode;
          socket.data.participantId = participantId;

          callback?.({
            success: true,
            room: room.getState(),
          });

          console.log(
            `Room created: ${room.roomCode} by ${payload.username}`
          );
        } catch (error) {
          console.error("create_room error:", error);

          callback?.({
            success: false,
            message: "Failed to create room",
          });
        }
      }
    );

    /*
     * JOIN ROOM
     */
    socket.on(
      "join_room",
      (payload: JoinRoomPayload, callback) => {
        try {
          if (!payload?.roomCode || !payload?.username?.trim()) {
            callback?.({
              success: false,
              message: "Room code and username are required",
            });
            return;
          }

          const roomCode = payload.roomCode
            .trim()
            .toUpperCase();

          const room = roomManager.getRoom(roomCode);

          if (!room) {
            callback?.({
              success: false,
              message: "Room not found",
            });
            return;
          }

          const participantId = crypto.randomUUID();

          const participant = roomManager.addParticipant(
            roomCode,
            participantId,
            socket.id,
            payload.username.trim()
          );

          if (!participant) {
            callback?.({
              success: false,
              message: "Unable to join room",
            });
            return;
          }

          socket.join(roomCode);

          socket.data.roomCode = roomCode;
          socket.data.participantId = participantId;

          callback?.({
            success: true,
            room: room.getState(),
            participant,
          });

          socket.to(roomCode).emit("user_joined", {
            participant,
          });

          console.log(
            `${payload.username} joined room ${roomCode}`
          );
        } catch (error) {
          console.error("join_room error:", error);

          callback?.({
            success: false,
            message: "Failed to join room",
          });
        }
      }
    );

    /*
     * PLAY
     */
    socket.on(
      "play",
      (payload: PlaybackPayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const participant = getSocketParticipant(
          socket,
          room
        );

        if (!participant) {
          sendError(callback, "Participant not found");
          return;
        }

        if (!participant.canControlPlayback()) {
          sendError(
            callback,
            "You do not have permission to control playback"
          );
          return;
        }

        room.updatePlayback(
          room.playbackState.videoId,
          "PLAYING",
          payload.currentTime
        );

        io.to(room.roomCode).emit("play", {
          currentTime: payload.currentTime,
          serverTimestamp: Date.now(),
          triggeredBy: participant.id,
        });

        callback?.({ success: true });
      }
    );

    /*
     * PAUSE
     */
    socket.on(
      "pause",
      (payload: PlaybackPayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const participant = getSocketParticipant(
          socket,
          room
        );

        if (!participant) {
          sendError(callback, "Participant not found");
          return;
        }

        if (!participant.canControlPlayback()) {
          sendError(
            callback,
            "You do not have permission to control playback"
          );
          return;
        }

        room.updatePlayback(
          room.playbackState.videoId,
          "PAUSED",
          payload.currentTime
        );

        io.to(room.roomCode).emit("pause", {
          currentTime: payload.currentTime,
          serverTimestamp: Date.now(),
          triggeredBy: participant.id,
        });

        callback?.({ success: true });
      }
    );

    /*
     * SEEK
     */
    socket.on(
      "seek",
      (payload: SeekPayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const participant = getSocketParticipant(
          socket,
          room
        );

        if (!participant) {
          sendError(callback, "Participant not found");
          return;
        }

        if (!participant.canControlPlayback()) {
          sendError(
            callback,
            "You do not have permission to seek"
          );
          return;
        }

        if (
          typeof payload.currentTime !== "number" ||
          payload.currentTime < 0
        ) {
          sendError(callback, "Invalid seek position");
          return;
        }

        room.updateCurrentTime(payload.currentTime);

        io.to(room.roomCode).emit("seek", {
          currentTime: payload.currentTime,
          serverTimestamp: Date.now(),
          triggeredBy: participant.id,
        });

        callback?.({ success: true });
      }
    );

    /*
     * CHANGE VIDEO
     */
    socket.on(
      "change_video",
      (payload: ChangeVideoPayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const participant = getSocketParticipant(
          socket,
          room
        );

        if (!participant) {
          sendError(callback, "Participant not found");
          return;
        }

        if (!participant.canControlPlayback()) {
          sendError(
            callback,
            "You do not have permission to change the video"
          );
          return;
        }

        if (!payload?.videoId?.trim()) {
          sendError(callback, "YouTube video ID is required");
          return;
        }

        const videoId = payload.videoId.trim();

        room.changeVideo(videoId);

        io.to(room.roomCode).emit("change_video", {
          videoId,
          currentTime: 0,
          playbackState: "PAUSED",
          triggeredBy: participant.id,
        });

        callback?.({ success: true });
      }
    );

    /*
     * PARTICIPANT PLAYBACK REQUESTS
     */
    socket.on(
      "request_playback_action",
      (payload: RequestPlaybackActionPayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const participant = getSocketParticipant(socket, room);

        if (!participant) {
          sendError(callback, "Participant not found");
          return;
        }

        if (participant.canControlPlayback()) {
          sendError(callback, "Hosts and moderators can control playback directly");
          return;
        }

        if (!room.playbackState.videoId) {
          sendError(callback, "Select a video before requesting playback");
          return;
        }

        if (!payload || !["PLAY", "PAUSE", "SEEK"].includes(payload.action)) {
          sendError(callback, "Invalid playback request");
          return;
        }

        if (
          typeof payload.currentTime !== "number" ||
          !Number.isFinite(payload.currentTime) ||
          payload.currentTime < 0
        ) {
          sendError(callback, "Invalid playback position");
          return;
        }

        const roomPending = Array.from(pendingPlaybackRequests.values())
          .filter((request) => request.roomCode === room.roomCode);

        if (roomPending.length >= 30) {
          sendError(callback, "This room has too many pending requests");
          return;
        }

        const duplicate = roomPending.some(
          (request) =>
            request.participantId === participant.id &&
            request.action === payload.action
        );

        if (duplicate) {
          sendError(callback, "You already have a pending request for this action");
          return;
        }

        const request: PendingPlaybackRequest = {
          id: crypto.randomUUID(),
          roomCode: room.roomCode,
          participantId: participant.id,
          username: participant.username,
          action: payload.action,
          currentTime: payload.currentTime,
          createdAt: Date.now(),
        };

        pendingPlaybackRequests.set(request.id, request);

        io.to(room.roomCode).emit("playback_request_created", request);
        callback?.({ success: true, requestId: request.id });
      }
    );

    socket.on(
      "resolve_playback_request",
      (payload: ResolvePlaybackRequestPayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const resolver = getSocketParticipant(socket, room);

        if (!resolver || !resolver.canControlPlayback()) {
          sendError(callback, "Only the host or a moderator can resolve requests");
          return;
        }

        if (!payload?.requestId || typeof payload.approve !== "boolean") {
          sendError(callback, "Invalid request resolution");
          return;
        }

        const request = pendingPlaybackRequests.get(payload.requestId);

        if (!request || request.roomCode !== room.roomCode) {
          sendError(callback, "This request is no longer pending");
          return;
        }

        pendingPlaybackRequests.delete(request.id);

        const requesterStillPresent = room.getParticipant(request.participantId);
        let status: "APPROVED" | "REJECTED" = payload.approve
          ? "APPROVED"
          : "REJECTED";

        if (!requesterStillPresent) {
          status = "REJECTED";
        } else if (payload.approve) {
          const currentTime = request.currentTime;

          if (request.action === "PLAY") {
            room.updatePlayback(room.playbackState.videoId, "PLAYING", currentTime);
            io.to(room.roomCode).emit("play", {
              currentTime,
              serverTimestamp: Date.now(),
              triggeredBy: resolver.id,
              approvedRequestId: request.id,
            });
          } else if (request.action === "PAUSE") {
            room.updatePlayback(room.playbackState.videoId, "PAUSED", currentTime);
            io.to(room.roomCode).emit("pause", {
              currentTime,
              serverTimestamp: Date.now(),
              triggeredBy: resolver.id,
              approvedRequestId: request.id,
            });
          } else {
            room.updateCurrentTime(currentTime);
            io.to(room.roomCode).emit("seek", {
              currentTime,
              serverTimestamp: Date.now(),
              triggeredBy: resolver.id,
              approvedRequestId: request.id,
            });
          }
        }

        io.to(room.roomCode).emit("playback_request_resolved", {
          requestId: request.id,
          status,
          resolvedBy: resolver.username,
        });

        callback?.({ success: true, status });
      }
    );

    /*
     * ASSIGN ROLE
     */
    socket.on(
      "assign_role",
      (payload: RolePayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const requester = getSocketParticipant(
          socket,
          room
        );

        if (!requester) {
          sendError(callback, "Participant not found");
          return;
        }

        if (!requester.canManageParticipants()) {
          sendError(
            callback,
            "Only the host can assign roles"
          );
          return;
        }

        if (payload.participantId === requester.id) {
          sendError(
            callback,
            "Host cannot change their own role"
          );
          return;
        }

        const target = room.getParticipant(
          payload.participantId
        );

        if (!target) {
          sendError(callback, "Participant not found");
          return;
        }

        if (payload.role === "HOST") {
          sendError(
            callback,
            "Host transfer is not enabled yet"
          );
          return;
        }

        const updated = room.assignRole(
          payload.participantId,
          payload.role
        );

        if (!updated) {
          sendError(callback, "Unable to assign role");
          return;
        }

        io.to(room.roomCode).emit("role_assigned", {
          participantId: payload.participantId,
          role: payload.role,
        });

        callback?.({
          success: true,
          participantId: payload.participantId,
          role: payload.role,
        });
      }
    );

    /*
     * REMOVE PARTICIPANT
     */
    socket.on(
      "remove_participant",
      (payload: RemoveParticipantPayload, callback) => {
        const room = getSocketRoom(socket);

        if (!room) {
          sendError(callback, "You are not inside a room");
          return;
        }

        const requester = getSocketParticipant(
          socket,
          room
        );

        if (!requester) {
          sendError(callback, "Participant not found");
          return;
        }

        if (!requester.canManageParticipants()) {
          sendError(
            callback,
            "Only the host can remove participants"
          );
          return;
        }

        const target = room.getParticipant(
          payload.participantId
        );

        if (!target) {
          sendError(callback, "Participant not found");
          return;
        }

        const targetSocketId = target.socketId;

        const removed = roomManager.removeParticipant(
          room.roomCode,
          payload.participantId
        );

        if (!removed) {
          sendError(
            callback,
            "Unable to remove participant"
          );
          return;
        }

        io.to(room.roomCode).emit("participant_removed", {
          participantId: payload.participantId,
        });

        const targetSocket = io.sockets.sockets.get(
          targetSocketId
        );

        if (targetSocket) {
          targetSocket.leave(room.roomCode);

          targetSocket.data.roomCode = undefined;
          targetSocket.data.participantId = undefined;

          targetSocket.emit("removed_from_room", {
            message: "You were removed from the room",
          });
        }

        callback?.({ success: true });
      }
    );

    /*
     * LEAVE ROOM
     */
    socket.on("leave_room", () => {
      leaveRoom(socket);
    });

    /*
     * DISCONNECT
     */
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);

      leaveRoom(socket);
    });
  });
}

/*
 * Get the room associated with a socket.
 */
function getSocketRoom(socket: Socket) {
  const roomCode = socket.data.roomCode as string | undefined;

  if (!roomCode) {
    return undefined;
  }

  return roomManager.getRoom(roomCode);
}

/*
 * Get the participant associated with a socket.
 */
function getSocketParticipant(
  socket: Socket,
  room: ReturnType<typeof roomManager.getRoom>
): Participant | undefined {
  if (!room) {
    return undefined;
  }

  const participantId =
    socket.data.participantId as string | undefined;

  if (!participantId) {
    return undefined;
  }

  return room.getParticipant(participantId);
}

/*
 * Remove a socket from its room.
 */
function leaveRoom(socket: Socket): void {
  const roomCode = socket.data.roomCode as string | undefined;
  const participantId =
    socket.data.participantId as string | undefined;

  if (!roomCode || !participantId) {
    return;
  }

  const room = roomManager.getRoom(roomCode);

  if (!room) {
    return;
  }

  const participant = room.getParticipant(participantId);

  room.removeParticipant(participantId);

  socket.leave(roomCode);

  socket.data.roomCode = undefined;
  socket.data.participantId = undefined;

  socket.to(roomCode).emit("user_left", {
    participantId,
    username: participant?.username,
  });

  if (room.getParticipants().length === 0) {
    roomManager.deleteRoom(roomCode);
  }
}

/*
 * Standard socket error response.
 */
function sendError(
  callback: ((response: unknown) => void) | undefined,
  message: string
): void {
  callback?.({
    success: false,
    message,
  });
}