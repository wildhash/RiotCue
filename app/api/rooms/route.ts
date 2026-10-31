import { randomInt } from "node:crypto";
import { NextRequest } from "next/server";
import { authenticate, jsonError } from "@/lib/server/supabase";

export const runtime = "nodejs";
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode() {
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export async function POST(request: NextRequest) {
  try {
    const { admin, user } = await authenticate(request);
    const body = await request.json();
    const name = String(body.name ?? "").trim().slice(0, 32);
    const duration = Number(body.duration ?? 60);
    const rounds = Number(body.rounds ?? 5);
    if (!name || !Number.isInteger(duration) || duration < 15 || duration > 300 ||
        !Number.isInteger(rounds) || rounds < 1 || rounds > 30) {
      return Response.json({ error: "Name, duration (15–300s), or rounds (1–30) invalid" }, { status: 400 });
    }
    for (let retry = 0; retry < 5; retry++) {
      const code = generateCode();
      const { error } = await admin.rpc("create_room", {
        p_code: code, p_user: user.id, p_name: name, p_duration: duration, p_rounds: rounds
      });
      if (!error) return Response.json({ code }, { status: 201 });
      if (error.code !== "23505") throw error;
    }
    return Response.json({ error: "Couldn't allocate a unique room code; retry" }, { status: 503 });
  } catch (error) {
    return jsonError(error);
  }
}
