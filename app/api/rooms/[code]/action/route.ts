import { NextRequest } from "next/server";
import { authenticate, jsonError, validateCode } from "@/lib/server/supabase";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { admin, user } = await authenticate(request);
    const code = validateCode((await params).code);
    const body = await request.json();
    if (!["start", "next", "win"].includes(body.action)) {
      return Response.json({ error: "Invalid game action" }, { status: 400 });
    }
    const { data: room, error: lookupError } = await admin.from("rooms")
      .select("id").eq("code", code).single();
    if (lookupError || !room) throw new Error("Room not found");
    const { error } = await admin.rpc("act_room", {
      p_room: room.id, p_user: user.id, p_action: body.action
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
