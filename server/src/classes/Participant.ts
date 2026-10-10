export type ParticipantRole = "HOST" | "MODERATOR" | "PARTICIPANT";

export class Participant {
  public readonly id: string;
  public socketId: string;
  public readonly userId: string;
  public username: string;
  public role: ParticipantRole;
  public joinedAt: Date;

  constructor(
    id: string,
    socketId: string,
    username: string,
    role: ParticipantRole = "PARTICIPANT",
    userId: string = ""
  ) {
    this.id = id;
    this.socketId = socketId;
    this.userId = userId;
    this.username = username;
    this.role = role;
    this.joinedAt = new Date();
  }

  reconnect(socketId: string): void {
    this.socketId = socketId;
  }

  setRole(role: ParticipantRole): void {
    this.role = role;
  }

  canControlPlayback(): boolean {
    return this.role === "HOST" || this.role === "MODERATOR";
  }

  canManageParticipants(): boolean {
    return this.role === "HOST";
  }
}