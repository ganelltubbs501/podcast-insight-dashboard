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
    teamId: row.team_id ?? null,

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
export async function saveTranscript(transcript: Transcript, teamId?: string): Promise<void> {
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
    team_id: teamId || null,
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
    .eq("user_id", auth.user.id) // 🔒 SECURITY: Only fetch user's own transcripts
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
    .eq("user_id", auth.user.id) // 🔒 SECURITY: Prevent IDOR - users can only access their own transcripts
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null; // Transcript not found or doesn't belong to user
  }

  return mapRowToTranscript(data);
}

export async function deleteTranscript(id: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("transcripts")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id); // 🔒 SECURITY: Users can only delete their own transcripts

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
    .eq("id", id)
    .eq("user_id", auth.user.id); // 🔒 SECURITY: Users can only update their own transcripts

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
    .eq("id", id)
    .eq("user_id", auth.user.id); // 🔒 SECURITY: Users can only update their own transcripts

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

// Use Supabase column aliasing to map snake_case to camelCase
const SCHEDULED_POST_SELECT = 'id, content, contentHtml:content_html, title, platform, provider, providerAccountId:provider_account_id, manualActionUrl:manual_action_url, status, metrics, meta, scheduledDate:scheduled_date, scheduledAt:scheduled_at, publishedAt:published_at, externalId:external_id, lastError:last_error, transcriptId:transcript_id, teamId:team_id';

export async function getScheduledPosts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scheduled_posts")
    .select(SCHEDULED_POST_SELECT)
    .eq("user_id", user.id)
    .order("scheduled_date", { ascending: true });

  if (error) {
    console.error('[getScheduledPosts] Query error:', error);
    throw error;
  }

  console.log('[getScheduledPosts] Raw data from Supabase:', data);
  return data || [];
}

export async function schedulePost(post: {
  platform: string;
  provider?: string;
  title?: string | null;
  content: string;
  contentHtml?: string | null;
  providerAccountId?: string | null;
  manualActionUrl?: string | null;
  meta?: Record<string, any> | null;
  scheduledDate: string;
  status?: string;
  transcriptId?: string;
  metadata?: Record<string, any>;
  teamId?: string;
}) {
  console.log('[schedulePost] INSERTING:', {
    platform: post.platform,
    contentPreview: post.content?.substring(0, 160),
    hasSubjectPrefix: post.content?.startsWith('Subject:'),
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: user.id,
      transcript_id: post.transcriptId || null,
      platform: post.platform,
      provider: post.provider || null,
      title: post.title || null,
      content: post.content,
      content_html: post.contentHtml || null,
      provider_account_id: post.providerAccountId || null,
      manual_action_url: post.manualActionUrl || null,
      scheduled_date: post.scheduledDate,
      scheduled_at: post.scheduledDate,
      status: post.status || 'Scheduled',
      metrics: post.metadata || null,
      meta: post.meta || null,
      team_id: post.teamId || null
    })
    .select(SCHEDULED_POST_SELECT)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Simplified scheduled post creation — only uses columns that exist in the DB.
 * Preferred over schedulePost() for new code.
 */
export async function createScheduledPost(input: {
  transcriptId?: string | null;
  platform: string;
  content: string;
  scheduledDate: string;
  status?: 'Scheduled' | 'Published' | 'Failed';
  meta?: Record<string, any>;
  provider?: string;
  title?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert({
      user_id: user.id,
      transcript_id: input.transcriptId ?? null,
      platform: input.platform,
      provider: input.provider ?? null,
      title: input.title ?? null,
      content: input.content,
      scheduled_date: input.scheduledDate,
      scheduled_at: input.scheduledDate,
      status: input.status ?? 'Scheduled',
      meta: input.meta ?? {},
    })
    .select(SCHEDULED_POST_SELECT)
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

  // Map camelCase to snake_case for database
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
    .select(SCHEDULED_POST_SELECT)
    .single();

  if (error) throw error;
  return data;
}
