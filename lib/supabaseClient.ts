import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// If env vars are missing, avoid throwing at import time so the app can run in dev mode.
// We export a lightweight stub that returns harmless responses or clear errors when used.
let _supabase: any;
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. Falling back to a dev stub. Database/auth calls will fail gracefully with clear errors."
  );

  _supabase = {
    auth: {
      // getUser returns no user (app will treat as unauthenticated)
      getUser: async () => ({ data: null, error: null }),
      signInWithPassword: async () => ({ data: null, error: new Error("Supabase not configured") }),
      signOut: async () => ({ error: new Error("Supabase not configured") }),
    },
    from: (_table: string) => {
      const chain: any = {
        // Helpful defaults for UI so lists return empty arrays instead of crashing
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ error: new Error("Supabase not configured") }),
        delete: async () => ({ error: new Error("Supabase not configured") }),
        update: async () => ({ error: new Error("Supabase not configured") }),
        single: async () => ({ data: null, error: new Error("Supabase not configured") }),
        order: function() { return chain; },
        eq: function() { return chain; },
      };
      return chain;
    },
  };
} else {
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = _supabase;
