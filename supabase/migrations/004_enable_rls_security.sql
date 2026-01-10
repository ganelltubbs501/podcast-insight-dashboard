-- ============================================================================
-- Migration 004: Enable Row-Level Security (RLS) on All Tables
-- ============================================================================
--
-- This migration enables RLS to ensure users can ONLY access their own data.
-- This is a critical security layer that works alongside application-level
-- user_id filters.
--
-- Date: January 10, 2026
-- Author: Security Hardening
--
-- ============================================================================

-- ============================================================================
-- 1. TRANSCRIPTS TABLE - Enable RLS
-- ============================================================================

-- Enable RLS on transcripts table
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent migration)
DROP POLICY IF EXISTS "Users can view their own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can insert their own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can update their own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can delete their own transcripts" ON transcripts;

-- CREATE: Users can view only their own transcripts
CREATE POLICY "Users can view their own transcripts"
ON transcripts
FOR SELECT
USING (auth.uid() = user_id);

-- CREATE: Users can insert transcripts with their own user_id
CREATE POLICY "Users can insert their own transcripts"
ON transcripts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update only their own transcripts
CREATE POLICY "Users can update their own transcripts"
ON transcripts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete only their own transcripts
CREATE POLICY "Users can delete their own transcripts"
ON transcripts
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 2. SCHEDULED_POSTS TABLE - Enable RLS
-- ============================================================================

-- Enable RLS on scheduled_posts table
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own scheduled posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Users can insert their own scheduled posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Users can update their own scheduled posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Users can delete their own scheduled posts" ON scheduled_posts;

-- SELECT: Users can view only their own scheduled posts
CREATE POLICY "Users can view their own scheduled posts"
ON scheduled_posts
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can create scheduled posts with their own user_id
CREATE POLICY "Users can insert their own scheduled posts"
ON scheduled_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update only their own scheduled posts
CREATE POLICY "Users can update their own scheduled posts"
ON scheduled_posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete only their own scheduled posts
CREATE POLICY "Users can delete their own scheduled posts"
ON scheduled_posts
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. VERIFICATION - Check RLS is enabled
-- ============================================================================

-- Verify RLS is enabled (this will show in the results)
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('transcripts', 'scheduled_posts')
ORDER BY tablename;

-- Show all policies created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('transcripts', 'scheduled_posts')
ORDER BY tablename, policyname;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- What RLS Does:
-- - Enforces data isolation at the database level
-- - Even if application code has bugs, users can't access other users' data
-- - Works automatically with Supabase Auth (auth.uid())
-- - Applies to ALL queries, including raw SQL
--
-- Testing RLS:
-- 1. Log in as User A
-- 2. Try to query: SELECT * FROM transcripts WHERE user_id = '<user_b_id>'
-- 3. Should return 0 rows (RLS blocks it)
--
-- RLS + Application Filters = Defense in Depth:
-- - Application code has .eq("user_id", auth.user.id)
-- - Database RLS ensures even if app code is bypassed, access is blocked
-- - Both layers must pass for data access
--
-- Performance:
-- - RLS policies use indexes efficiently
-- - user_id should be indexed (migration 005 will add if needed)
--
-- ============================================================================
