import { NextRequest } from "next/server";
import { authenticate, jsonError, validateCode } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { admin, user } = await authenticate(request);
    const code = validateCode((await params).code);
    const { data: first, error: lookupError } = await admin.from("rooms")
      .select("id").eq("code", code).single();
    if (lookupError || !first) throw new Error("Room not found");

    const { data: member, error: memberError } = await admin.from("room_members")
      .select("user_id").eq("room_id", first.id).eq("user_id", user.id).maybeSingle();
    if (memberError || !member) {
      return Response.json({ error: "Join this room before viewing it" }, { status: 403 });
    }
    const { error: syncError } = await admin.rpc("sync_room", {
      p_room: first.id, p_user: user.id
    });
    if (syncError) throw syncError;
    const [{ data: room, error: roomError }, { data: members, error: rosterError }] =
      await Promise.all([
        admin.from("rooms").select("*").eq("id", first.id).single(),
        admin.from("room_members").select("*").eq("room_id", first.id)
          .order("joined_at", { ascending: true })
      ]);
    if (roomError || rosterError || !room) throw roomError ?? rosterError ?? new Error("Room unavailable");
    return Response.json({ room, members, me: user.id, serverNow: new Date().toISOString() }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return jsonError(error);
  }
}
