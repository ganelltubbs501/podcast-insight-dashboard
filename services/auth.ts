import { supabase } from "../lib/supabaseClient";
import { User } from "../types";

function mapUser(u: any): User {
  return {
    id: u.id,
    email: u.email ?? "",
    name: (u.email ?? "user").split("@")[0],
    plan: "Free",
    role: "Owner",
  };
}

async function ensureProfileExists(userId: string) {
  // Attempt to create profile row (beta cap triggers here)
  const { error } = await supabase
    .from("profiles")
    .insert({ id: userId });

  if (!error) return;

  // If already exists, ignore
  // Postgres unique violation = 23505
  if ((error as any).code === "23505") return;

  // If beta is full, sign out and throw a friendly error
  const msg = (error as any).message || "";
  if (msg.includes("Beta is full")) {
    await supabase.auth.signOut();
    throw new Error("Beta is full (50 users). Please try again later.");
  }

  // Any other error should surface
  throw error;
}

export async function getStoredUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  await ensureProfileExists(data.user.id);

  return mapUser(data.user);
}

export async function loginUser(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Login failed: no user returned");
  return mapUser(data.user);
}

export async function signUpUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin, // https://loquihq-beta.web.app
    },
  });

  if (error) throw error;

  // If email confirmation is ON, session may be null until user confirms.
  // Return whatever Supabase provides so UI can show the right message.
  return data;
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}
