-- 020_connected_accounts_enhancements.sql
-- Add status tracking and metadata to connected_accounts for unified integration layer

-- Add status column for tracking connection health
ALTER TABLE public.connected_accounts
ADD COLUMN IF NOT EXISTS status text DEFAULT 'connected'
  CHECK (status IN ('connected', 'error', 'disconnected'));

-- Add last_sync_at for tracking when we last synced with provider
ALTER TABLE public.connected_accounts
ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;

-- Add metadata column for provider-specific data (audiences, API versions, etc.)
ALTER TABLE public.connected_accounts
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Index for querying by status (find all errored connections)
CREATE INDEX IF NOT EXISTS idx_connected_accounts_status
ON public.connected_accounts(status);

-- Index for sync queries (find stale connections)
CREATE INDEX IF NOT EXISTS idx_connected_accounts_last_sync
ON public.connected_accounts(last_sync_at);

-- Add helpful comments
COMMENT ON COLUMN public.connected_accounts.status IS 'Connection health status: connected, error, or disconnected';
COMMENT ON COLUMN public.connected_accounts.last_sync_at IS 'Timestamp of last successful sync with provider';
COMMENT ON COLUMN public.connected_accounts.metadata IS 'Provider-specific metadata (audiences, API versions, etc.)';
