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
    const { data: room, error: lookupError } = await admin.from("rooms")
      .select("id,round_no").eq("code", code).single();
    if (lookupError || !room) throw new Error("Room not found");
    const { data, error } = await admin.rpc("get_actor_prompt", {
      p_room: room.id, p_user: user.id
    });
    if (error) throw error;
    if (!data) return Response.json({ error: "No private prompt available" }, { status: 403 });
    return Response.json({ prompt: data, round_no: room.round_no }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return jsonError(error);
  }
}
