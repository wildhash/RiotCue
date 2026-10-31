import type { Phase } from "./types";

export function remainingMs(deadline: string | null, now = Date.now()): number {
  return deadline ? Math.max(0, Date.parse(deadline) - now) : 0;
}

export function visibleSeconds(deadline: string | null, now = Date.now()): number {
  return Math.ceil(remainingMs(deadline, now) / 1000);
}

export function labelForPhase(phase: Phase): string {
  const labels: Record<Phase, string> = {
    lobby: "Gather your crew",
    countdown: "Launch sequence",
    playing: "ACT IT OUT!",
    won: "NAILED IT!",
    expired: "BOOM! TIME'S UP",
    finished: "FINAL SCORES"
  };
  return labels[phase];
}

export function nextActor<T extends { user_id: string; role: string; joined_at: string }>(
  members: T[],
  roundNo: number
): T | null {
  const playing = members.filter(m => m.role !== "spectator")
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at) || a.user_id.localeCompare(b.user_id));
  return playing.length ? playing[(roundNo - 1) % playing.length] : null;
}
