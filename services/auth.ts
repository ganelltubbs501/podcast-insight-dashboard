import { supabase } from "../lib/supabaseClient";
import { User } from "../types";

function mapUser(u: any, profileName?: string | null): User {
  return {
    id: u.id,
    email: u.email ?? "",
    name: profileName || (u.email ?? "user").split("@")[0],
    plan: "Free",
    role: "Owner",
  };
}

export async function fetchProfileName(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle();
  return data?.full_name || null;
}

export async function ensureProfileExists(userId: string) {
  // Use upsert to be idempotent - won't fail if profile already exists
  // The beta cap trigger will still fire on new inserts
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, created_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: true }
    );

  if (!error) return;

  // If beta is full, sign out and throw a friendly error
  const msg = (error as any).message || "";
  if (msg.includes("Beta is full")) {
    await supabase.auth.signOut();
    throw new Error("Beta is full (50 users). Please try again later.");
  }

  // RLS violation (user can only insert their own profile)
  if ((error as any).code === "42501") {
    console.warn("Profile RLS violation - user may already exist");
    return; // Likely already exists, safe to continue
  }

  // Any other error should surface
  throw error;
}

export async function getStoredUser(): Promise<User | null> {
  // Use getSession() first — reads from localStorage without a network call.
  // getUser() makes an HTTP request that can fail/race after OAuth redirects.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null;

  await ensureProfileExists(sessionData.session.user.id);

  const profileName = await fetchProfileName(sessionData.session.user.id);
  return mapUser(sessionData.session.user, profileName);
}

export async function loginUser(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Login failed: no user returned");

  const profileName = await fetchProfileName(data.user.id);
  return mapUser(data.user, profileName);
}

// NOTE: Direct signUp removed - beta signup now goes through /api/signup
// which enforces cap and sends invite emails via backend

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}
