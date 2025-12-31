import { supabase } from "../lib/supabaseClient";
import { Transcript, WorkflowStatus } from "../types";

/**
 * Supabase returns json/jsonb correctly, but if your column is TEXT
 * (or older rows were saved as strings), this makes it safe.
 */
function safeParseJSON<T>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeTranscript(row: any): Transcript {
  return {
    ...row,
    // Ensure these are objects, not strings
    result: safeParseJSON(row.result, null),
    settings: safeParseJSON(row.settings, null),

    // Some UIs expect "date"
    date: row.date ?? row.created_at ?? new Date().toISOString(),

    // Your UI sometimes references workflowStatus — if you don’t have that column,
    // keep it harmlessly derived from "status"
    workflowStatus: row.workflowStatus ?? row.workflow_status ?? row.status ?? "Draft",
  } as Transcript;
}

async function requireUserId(): Promise<string> {
  const userRes = await supabase.auth.getUser();
  const userId = userRes.data.user?.id;
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/**
 * Insert a transcript row.
 * IMPORTANT: Do NOT include columns that do not exist (ex: comments).
 */
export async function saveTranscript(transcript: Transcript): Promise<void> {
  console.log("SAVE → transcripts.ts called");
  const userId = await requireUserId();
  console.log("SAVE → user id:", userId);

  const payload = {
    id: transcript.id,
    user_id: userId,
    title: transcript.title,
    content: transcript.content,
    status: transcript.status,
    result: transcript.result ?? null,
    settings: transcript.settings ?? null,
  };

  const { error } = await supabase.from("transcripts").insert(payload);
  if (error) throw error;
}

export async function getTranscripts(): Promise<Transcript[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeTranscript);
}

export async function getTranscriptById(id: string): Promise<Transcript | null> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    // If it's just "no rows", return null instead of crashing
    if ((error as any).code === "PGRST116") return null;
    throw error;
  }

  return data ? normalizeTranscript(data) : null;
}

/**
 * Keep this simple: update the existing "status" column (since we know it exists).
 */
export async function updateTranscriptStatus(id: string, status: WorkflowStatus): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from("transcripts")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Merge new result fields into the existing result JSON.
 * This is how we safely store comments without needing a "comments" column.
 */
export async function saveTranscriptResult(id: string, patch: Record<string, any>): Promise<void> {
  const existing = await getTranscriptById(id);
  if (!existing) throw new Error("Transcript not found");

  const merged = {
    ...(existing.result ?? {}),
    ...(patch ?? {}),
  };

  const userId = await requireUserId();

  const { error } = await supabase
    .from("transcripts")
    .update({ result: merged })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Comments are stored INSIDE result.comments[] (NOT a transcripts.comments column).
 */
export async function addCommentToTranscript(
  id: string,
  text: string,
  user: { name?: string; email?: string }
): Promise<void> {
  const existing = await getTranscriptById(id);
  if (!existing) throw new Error("Transcript not found");

  const resultObj = existing.result ?? {};
  const currentComments = Array.isArray(resultObj.comments) ? resultObj.comments : [];

  const newComment = {
    id: crypto?.randomUUID?.() ?? `${Date.now()}`,
    userName: user.name || user.email || "User",
    timestamp: new Date().toISOString(),
    text,
  };

  const updated = {
    ...resultObj,
    comments: [...currentComments, newComment],
  };

  await saveTranscriptResult(id, updated);
}
