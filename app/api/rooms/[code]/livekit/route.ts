import { NextRequest } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { authenticate, jsonError, validateCode } from "@/lib/server/supabase";

export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { admin, user } = await authenticate(request);
    const code = validateCode((await params).code);
    const key = process.env.LIVEKIT_API_KEY;
    const secret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    if (!key || !secret || !url) {
      return Response.json({ enabled: false });
    }
    const { data: room, error: roomError } = await admin.from("rooms")
      .select("id").eq("code", code).single();
    if (roomError || !room) throw new Error("Room not found");
    const { data: member, error: memberError } = await admin.from("room_members")
      .select("display_name,role").eq("room_id", room.id).eq("user_id", user.id).maybeSingle();
    if (memberError || !member) {
      return Response.json({ error: "Join room before enabling media" }, { status: 403 });
    }
    const token = new AccessToken(key, secret, {
      identity: user.id, name: member.display_name, ttl: "1h"
    });
    token.addGrant({
      roomJoin: true, room: `riotcue-${room.id}`,
      canPublish: member.role !== "spectator", canSubscribe: true
    });
    return Response.json({ enabled: true, url, token: await token.toJwt() }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return jsonError(error);
  }
}
