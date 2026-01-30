-- Email Lists table for storing user's email distribution lists
-- Users can import CSV files to create lists for email series campaigns

CREATE TABLE IF NOT EXISTS email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  emails TEXT[] NOT NULL DEFAULT '{}',
  email_count INTEGER GENERATED ALWAYS AS (array_length(emails, 1)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_email_lists_user_id ON email_lists(user_id);

-- RLS policies
ALTER TABLE email_lists ENABLE ROW LEVEL SECURITY;

-- Users can only see their own email lists
CREATE POLICY "Users can view own email lists"
  ON email_lists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own email lists
CREATE POLICY "Users can insert own email lists"
  ON email_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own email lists
CREATE POLICY "Users can update own email lists"
  ON email_lists FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own email lists
CREATE POLICY "Users can delete own email lists"
  ON email_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_lists_updated_at
  BEFORE UPDATE ON email_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_email_lists_updated_at();
