import { supabase } from "../lib/supabaseClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

function requireApi() {
  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not configured');
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function getJSON<T>(path: string): Promise<T> {
  requireApi();
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: 'include'
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export const getKitAuthUrl = () => getJSON<{ url: string }>("/api/integrations/kit/auth-url");
export const getKitStatus = () => getJSON<{ connected: boolean; accountName?: string }>("/api/integrations/kit/status");
