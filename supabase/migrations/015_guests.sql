-- ============================================================================
-- Migration 015: Guests Table for Guest Outreach Feature
-- ============================================================================
--
-- This migration creates the guests table for tracking potential podcast guests
-- through the outreach pipeline (Suggested -> Contacted -> Booked/Rejected)
--
-- ============================================================================

-- Create guests table
CREATE TABLE IF NOT EXISTS public.guests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,

  name text NOT NULL,
  title text,
  bio text,
  expertise text[] DEFAULT '{}',
  status text DEFAULT 'Suggested' CHECK (status IN ('Suggested', 'Contacted', 'Booked', 'Rejected')),

  email text,
  website text,
  notes text,
  match_reason text,
  source_transcript_id uuid REFERENCES public.transcripts(id) ON DELETE SET NULL,

  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS guests_user_id_idx ON public.guests (user_id);
CREATE INDEX IF NOT EXISTS guests_status_idx ON public.guests (status);
CREATE INDEX IF NOT EXISTS guests_created_at_idx ON public.guests (created_at);

-- ============================================================================
-- Enable Row-Level Security
-- ============================================================================

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own guests" ON guests;
DROP POLICY IF EXISTS "Users can insert their own guests" ON guests;
DROP POLICY IF EXISTS "Users can update their own guests" ON guests;
DROP POLICY IF EXISTS "Users can delete their own guests" ON guests;

-- SELECT: Users can view only their own guests
CREATE POLICY "Users can view their own guests"
ON guests
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create guests with their own user_id
CREATE POLICY "Users can insert their own guests"
ON guests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update only their own guests
CREATE POLICY "Users can update their own guests"
ON guests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete only their own guests
CREATE POLICY "Users can delete their own guests"
ON guests
FOR DELETE
USING (auth.uid() = user_id);
