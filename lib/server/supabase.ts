import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials are not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticate(request: NextRequest) {
  const bearer = request.headers.get("authorization") ?? "";
  if (!bearer.startsWith("Bearer ")) throw new Error("Sign in as a guest to continue");
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(bearer.slice(7));
  if (error || !data.user) throw new Error("Invalid or expired guest session");
  return { admin, user: data.user };
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Request failed";
  return Response.json({ error: message }, { status });
}

export function validateCode(code: string): string {
  const normalized = code.toUpperCase().trim();
  if (!/^[A-Z2-9]{6}$/.test(normalized)) throw new Error("Invalid room code");
  return normalized;
}
