import {
  Participant,
  ParticipantRole,
} from "./Participant.js";

export type PlaybackState = "PLAYING" | "PAUSED";

export interface RoomPlaybackState {
  videoId: string;
  playbackState: PlaybackState;
  currentTime: number;
  updatedAt: number;
}

export class Room {
  public readonly id: string;
  public readonly roomCode: string;
  public readonly createdAt: Date;

  public hostId: string;

  private participants: Map<string, Participant>;

  public playbackState: RoomPlaybackState;

  constructor(
    id: string,
    roomCode: string,
    hostId: string,
    initialVideoId: string = ""
  ) {
    this.id = id;
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.createdAt = new Date();

    this.participants = new Map();

    this.playbackState = {
      videoId: initialVideoId,
      playbackState: "PAUSED",
      currentTime: 0,
      updatedAt: Date.now(),
    };
  }

  addParticipant(participant: Participant): void {
    this.participants.set(participant.id, participant);
  }

  removeParticipant(participantId: string): boolean {
    return this.participants.delete(participantId);
  }

  getParticipant(participantId: string): Participant | undefined {
    return this.participants.get(participantId);
  }

  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  assignRole(
    participantId: string,
    role: ParticipantRole
  ): boolean {
    const participant = this.participants.get(participantId);

    if (!participant) {
      return false;
    }

    participant.setRole(role);

    return true;
  }

  removeUser(participantId: string): boolean {
    if (participantId === this.hostId) {
      return false;
    }

    return this.participants.delete(participantId);
  }

  updatePlayback(
    videoId: string,
    playbackState: PlaybackState,
    currentTime: number
  ): void {
    this.playbackState = {
      videoId,
      playbackState,
      currentTime,
      updatedAt: Date.now(),
    };
  }

  updateCurrentTime(currentTime: number): void {
    this.playbackState.currentTime = currentTime;
    this.playbackState.updatedAt = Date.now();
  }

  changeVideo(videoId: string): void {
    this.playbackState.videoId = videoId;
    this.playbackState.currentTime = 0;
    this.playbackState.playbackState = "PAUSED";
    this.playbackState.updatedAt = Date.now();
  }

  getState() {
    return {
      id: this.id,
      roomCode: this.roomCode,
      hostId: this.hostId,
      createdAt: this.createdAt,
      playbackState: this.playbackState,
      participants: this.getParticipants(),
    };
  }
}