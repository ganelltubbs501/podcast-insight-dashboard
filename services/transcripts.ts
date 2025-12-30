import { supabase } from "../lib/supabaseClient";
import { Transcript } from "../types";

export async function saveTranscript(transcript: Transcript): Promise<void> {
  console.log("SAVE → transcripts.ts called");
  console.log("SAVE → user id:", (await supabase.auth.getUser()).data.user?.id);

  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error("Not authenticated");

  const { error } = await supabase.from("transcripts").insert({
    id: transcript.id,
    user_id: user.data.user.id,
    title: transcript.title,
    content: transcript.content,
    status: transcript.status,
    result: transcript.result,
    settings: transcript.settings,
  });

  if (error) throw error;
}

export async function getTranscripts(): Promise<Transcript[]> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Transcript[];
}

export async function getTranscriptById(id: string): Promise<Transcript | null> {
  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Transcript;
}
