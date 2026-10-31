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
    const name = String(body.name ?? "").trim().slice(0, 32);
    if (!name) return Response.json({ error: "Enter a name" }, { status: 400 });
    const { error } = await admin.rpc("join_room", {
      p_code: code, p_user: user.id, p_name: name, p_spectator: body.spectator === true
    });
    if (error) throw error;
    return Response.json({ code });
  } catch (error) {
    return jsonError(error);
  }
}
