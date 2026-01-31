-- 021_integration_events.sql
-- Integration events table for logging all provider interactions
-- Provides visibility when things break and audit trail for debugging

CREATE TABLE IF NOT EXISTS public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    -- Authentication events
    'auth_start', 'auth_success', 'auth_failure',
    -- Token management
    'token_refresh', 'token_refresh_failure',
    -- API interactions
    'api_call', 'api_error',
    -- Sync operations
    'sync_start', 'sync_success', 'sync_failure',
    -- CRM operations
    'contact_upsert', 'subscribe', 'unsubscribe', 'tag',
    -- Send operations
    'send', 'send_failure'
  )),
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_integration_events_user_id
ON public.integration_events(user_id);

CREATE INDEX IF NOT EXISTS idx_integration_events_provider
ON public.integration_events(provider);

CREATE INDEX IF NOT EXISTS idx_integration_events_created_at
ON public.integration_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_events_type_status
ON public.integration_events(event_type, status);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_integration_events_user_provider_created
ON public.integration_events(user_id, provider, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view own integration events" ON public.integration_events;
CREATE POLICY "Users can view own integration events"
ON public.integration_events FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to integration events" ON public.integration_events;
CREATE POLICY "Service role full access to integration events"
ON public.integration_events FOR ALL
USING (auth.role() = 'service_role');

-- Function to cleanup old events (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_integration_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.integration_events
  WHERE created_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add helpful comments
COMMENT ON TABLE public.integration_events IS 'Audit log for all integration API calls and events';
COMMENT ON COLUMN public.integration_events.event_type IS 'Type of event: auth, sync, api_call, send, etc.';
COMMENT ON COLUMN public.integration_events.payload IS 'Request/response data (sanitized, no tokens)';
COMMENT ON COLUMN public.integration_events.status IS 'Outcome: success, failure, or pending';
COMMENT ON FUNCTION cleanup_old_integration_events() IS 'Removes events older than 30 days, returns count deleted';
