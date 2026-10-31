export type Phase = "lobby" | "countdown" | "playing" | "won" | "expired" | "finished";
export type Role = "host" | "player" | "spectator";

export interface Room {
  id: string;
  code: string;
  host_id: string;
  phase: Phase;
  actor_id: string | null;
  round_no: number;
  total_rounds: number;
  duration_seconds: number;
  countdown_ends_at: string | null;
  round_ends_at: string | null;
  public_answer: string | null;
  created_at: string;
}

export interface Member {
  room_id: string;
  user_id: string;
  display_name: string;
  role: Role;
  score: number;
  joined_at: string;
}

export interface RoomSnapshot {
  room: Room;
  members: Member[];
  serverNow: string;
  me: string;
}

export interface PrivatePrompt {
  prompt: string;
  round_no: number;
}
