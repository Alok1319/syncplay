export type ParticipantRole = "HOST" | "MODERATOR" | "PARTICIPANT";

export class Participant {
  public readonly id: string;
  public readonly socketId: string;
  public username: string;
  public role: ParticipantRole;
  public joinedAt: Date;

  constructor(
    id: string,
    socketId: string,
    username: string,
    role: ParticipantRole = "PARTICIPANT"
  ) {
    this.id = id;
    this.socketId = socketId;
    this.username = username;
    this.role = role;
    this.joinedAt = new Date();
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