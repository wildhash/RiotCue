import { describe, expect, it } from "vitest";
import { labelForPhase, nextActor, remainingMs, visibleSeconds } from "../lib/game/timing";

describe("clock and phase helpers", () => {
  it("never displays negative time", () => {
    expect(remainingMs("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:10.000Z"))).toBe(0);
  });
  it("rounds up the remaining second for a visible timer", () => {
    expect(visibleSeconds("2026-01-01T00:00:01.100Z", Date.parse("2026-01-01T00:00:00.000Z"))).toBe(2);
  });
  it("selects actors fairly and excludes spectators", () => {
    const members = [
      { user_id:"b", role:"player", joined_at:"2026-01-01T00:00:02Z" },
      { user_id:"s", role:"spectator", joined_at:"2026-01-01T00:00:00Z" },
      { user_id:"a", role:"host", joined_at:"2026-01-01T00:00:01Z" }
    ];
    expect(nextActor(members, 1)?.user_id).toBe("a");
    expect(nextActor(members, 2)?.user_id).toBe("b");
    expect(nextActor(members, 3)?.user_id).toBe("a");
  });
  it("has an engaging label for every terminal state", () => {
    expect(labelForPhase("won")).toMatch(/NAILED/);
    expect(labelForPhase("expired")).toMatch(/BOOM/);
  });
});
