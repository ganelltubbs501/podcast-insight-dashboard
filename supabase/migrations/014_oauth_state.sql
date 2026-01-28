-- ============================================================================
-- OAUTH STATE TABLE: Store PKCE code verifiers during OAuth flow
-- Used by X and other providers that require PKCE
-- ============================================================================

-- Create oauth_state table for storing temporary OAuth flow data
CREATE TABLE IF NOT EXISTS oauth_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  state text NOT NULL,
  code_verifier text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Each user can only have one pending OAuth flow per provider
  CONSTRAINT oauth_state_user_provider_unique UNIQUE (user_id, provider)
);

-- Index for looking up by state (used during callback)
CREATE INDEX IF NOT EXISTS idx_oauth_state_state ON oauth_state(state);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_state_expires_at ON oauth_state(expires_at);

-- Enable RLS
ALTER TABLE oauth_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own OAuth state
CREATE POLICY "Users can view own oauth state"
  ON oauth_state FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own OAuth state
CREATE POLICY "Users can insert own oauth state"
  ON oauth_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own OAuth state
CREATE POLICY "Users can delete own oauth state"
  ON oauth_state FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all states (for server-side operations)
CREATE POLICY "Service role full access to oauth state"
  ON oauth_state FOR ALL
  USING (auth.role() = 'service_role');

-- Function to clean up expired OAuth states (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM oauth_state WHERE expires_at < now();
END;
$$;
