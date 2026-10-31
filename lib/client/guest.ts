import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
export function browserSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Configure Supabase in .env.local first");
    client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
  return client;
}

let pendingGuest: Promise<string> | null = null;
export async function guestToken(): Promise<string> {
  const db = browserSupabase();
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.access_token) return sessionData.session.access_token;
  if (!pendingGuest) {
    pendingGuest = db.auth.signInAnonymously().then(({ data, error }) => {
      if (error || !data.session) throw error ?? new Error("Couldn't start guest session");
      return data.session.access_token;
    }).finally(() => { pendingGuest = null; });
  }
  return pendingGuest;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await guestToken();
  const response = await fetch(`/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = data && typeof data === "object" && "error" in data
      ? String(data.error) : `Request failed (${response.status})`;
    const exception = new Error(error) as Error & { status?: number };
    exception.status = response.status;
    throw exception;
  }
  return data as T;
}
