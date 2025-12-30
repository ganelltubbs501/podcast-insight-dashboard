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

export async function getStoredUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return mapUser(data.user);
}

export async function loginUser(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Login failed: no user returned");
  return mapUser(data.user);
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}
