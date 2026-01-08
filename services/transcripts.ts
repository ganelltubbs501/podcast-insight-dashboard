import { supabase } from "../lib/supabaseClient";
import { Transcript, Comment, WorkflowStatus, UsageMetrics } from "../types";

/**
 * Helpers
 */
function getWorkflowStatus(row: any): WorkflowStatus {
  // Prefer real column if you add it later
  if (row.workflowStatus) return row.workflowStatus as WorkflowStatus;
  if (row.workflow_status) return row.workflow_status as WorkflowStatus;

  // Fallback: stored inside JSON
  const fromResult = row.result?.workflowStatus;
  if (fromResult) return fromResult as WorkflowStatus;

  const fromSettings = row.settings?.workflowStatus;
  if (fromSettings) return fromSettings as WorkflowStatus;

  return "Draft";
}

function getComments(row: any): Comment[] {
  // If you add comments column later, this supports it
  if (Array.isArray(row.comments)) return row.comments as Comment[];

  // Fallback: store comments inside result JSON
  if (Array.isArray(row.result?.comments)) return row.result.comments as Comment[];

  return [];
}

function mapRowToTranscript(row: any): Transcript {
  return {
    id: row.id,
    title: row.title ?? "Untitled Episode",
    content: row.content ?? "",
    status: row.status ?? "Completed",
    date: row.created_at ?? new Date().toISOString(),
    settings: row.settings ?? null,
    result: row.result ?? null,

    // These are NOT DB columns right now. We synthesize them.
    comments: getComments(row),
    workflowStatus: getWorkflowStatus(row),
  } as Transcript;
}

/**
 * Save a new transcript row.
 * IMPORTANT: Do NOT insert columns that aren't in your Supabase schema (like "comments").
 * We'll embed workflowStatus/comments inside `result` JSON until you add real columns.
 */
export async function saveTranscript(transcript: Transcript): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  // Embed missing fields inside result JSON so UI can still use them
  const resultWithMeta = {
    ...(transcript.result ?? {}),
    workflowStatus: transcript.workflowStatus ?? "Draft",
    comments: transcript.comments ?? [],
  };

  const { error } = await supabase.from("transcripts").insert({
    id: transcript.id,
    user_id: auth.user.id,
    title: transcript.title,
    content: transcript.content,
    status: transcript.status,
    result: resultWithMeta,
    settings: transcript.settings,
  });

  if (error) throw error;
}

/**
 * Load transcripts for the current logged-in user only.
 */
export async function getTranscripts(): Promise<Transcript[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapRowToTranscript);
}

export async function getTranscriptById(id: string): Promise<Transcript | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapRowToTranscript(data);
}

export async function deleteTranscript(id: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("transcripts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Update "workflowStatus" (stored inside result JSON for now).
 */
export async function updateTranscriptStatus(id: string, workflowStatus: WorkflowStatus): Promise<void> {
  const transcript = await getTranscriptById(id);
  if (!transcript) throw new Error("Transcript not found");

  const updatedResult = {
    ...(transcript.result ?? {}),
    workflowStatus,
    comments: transcript.comments ?? [],
  };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("transcripts")
    .update({ result: updatedResult })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Save partial result updates (ex: repurposed, sponsorship, etc).
 */
export async function saveTranscriptResult(id: string, patch: Record<string, any>): Promise<void> {
  const transcript = await getTranscriptById(id);
  if (!transcript) throw new Error("Transcript not found");

  const updatedResult = {
    ...(transcript.result ?? {}),
    ...patch,
    workflowStatus: transcript.workflowStatus ?? "Draft",
    comments: transcript.comments ?? [],
  };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("transcripts")
    .update({ result: updatedResult })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Add a comment (stored inside result.comments for now).
 */
export async function addCommentToTranscript(
  id: string,
  text: string,
  user: { id: string; name: string }
): Promise<void> {
  const transcript = await getTranscriptById(id);
  if (!transcript) throw new Error("Transcript not found");

  const newComment: Comment = {
    id: crypto.randomUUID(),
    text,
    userId: user.id,
    userName: user.name,
    timestamp: new Date().toISOString(),
  };

  const comments = [...(transcript.comments ?? []), newComment];

  await saveTranscriptResult(id, { comments });
}

/**
 * Basic usage metrics (client-side). You can make this smarter later.
 */
export async function getUsageMetrics(): Promise<UsageMetrics> {
  const list = await getTranscripts();
  const used = list.length;

  return {
    transcriptsUsed: used,
    transcriptQuota: 100,
    quotaResetDate: "Next month",
    hoursSaved: Math.round(used * 0.5),
  } as UsageMetrics;
}

/**
 * Scheduled Posts Functions
 */

export async function getScheduledPosts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_date", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function schedulePost(post: {
  platform: string;
  content: string;
  scheduledDate: string;
  status?: string;
  transcriptId?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: user.id,
      transcript_id: post.transcriptId || null,
      platform: post.platform,
      content: post.content,
      scheduled_date: post.scheduledDate,
      status: post.status || 'Scheduled',
      metrics: null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScheduledPost(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("scheduled_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // Ensure user can only delete their own posts

  if (error) throw error;
  return { success: true };
}

export async function updateScheduledPost(id: string, updates: {
  platform?: string;
  content?: string;
  scheduledDate?: string;
  status?: string;
  metrics?: any;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const updateData: any = {};
  if (updates.platform) updateData.platform = updates.platform;
  if (updates.content) updateData.content = updates.content;
  if (updates.scheduledDate) updateData.scheduled_date = updates.scheduledDate;
  if (updates.status) updateData.status = updates.status;
  if (updates.metrics !== undefined) updateData.metrics = updates.metrics;

  const { data, error } = await supabase
    .from("scheduled_posts")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
