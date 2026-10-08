import crypto from "crypto";
import { Room } from "./Room.js";
import {
  Participant,
  ParticipantRole,
} from "./Participant.js";

export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(
    hostId: string,
    socketId: string,
    username: string,
    initialVideoId: string = ""
  ): Room {
    const roomId = crypto.randomUUID();
    const roomCode = this.generateRoomCode();

    const room = new Room(
      roomId,
      roomCode,
      hostId,
      initialVideoId
    );

    const host = new Participant(
      hostId,
      socketId,
      username,
      "HOST"
    );

    room.addParticipant(host);

    this.rooms.set(roomCode, room);

    return room;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  deleteRoom(roomCode: string): boolean {
    return this.rooms.delete(roomCode);
  }

  addParticipant(
    roomCode: string,
    participantId: string,
    socketId: string,
    username: string
  ): Participant | null {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return null;
    }

    const participant = new Participant(
      participantId,
      socketId,
      username,
      "PARTICIPANT"
    );

    room.addParticipant(participant);

    return participant;
  }

  removeParticipant(
    roomCode: string,
    participantId: string
  ): boolean {
    const room = this.rooms.get(roomCode);

    if (!room) {
      return false;
    }

    return room.removeUser(participantId);
  }

  private generateRoomCode(): string {
    let code = "";

    do {
      code = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
    } while (this.rooms.has(code));

    return code;
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}

export const roomManager = new RoomManager();