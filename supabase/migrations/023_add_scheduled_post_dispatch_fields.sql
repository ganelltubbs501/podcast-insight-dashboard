-- 023_add_scheduled_post_dispatch_fields.sql
-- Add provider dispatch fields for scheduled email sends

ALTER TABLE public.scheduled_posts
ADD COLUMN IF NOT EXISTS provider text,
ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS published_at timestamptz,
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS last_error text;

-- Backfill scheduled_at from existing scheduled_date
UPDATE public.scheduled_posts
SET scheduled_at = scheduled_date
WHERE scheduled_at IS NULL;

-- Update status constraint to include NeedsManualSend
ALTER TABLE public.scheduled_posts
DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;

ALTER TABLE public.scheduled_posts
ADD CONSTRAINT scheduled_posts_status_check
CHECK (status IN ('Scheduled', 'Published', 'Failed', 'NeedsManualSend'));

COMMENT ON COLUMN public.scheduled_posts.provider IS 'Provider used for dispatch (kit, mailchimp, etc.)';
COMMENT ON COLUMN public.scheduled_posts.scheduled_at IS 'Timestamp for scheduled dispatch (mirrors scheduled_date)';
COMMENT ON COLUMN public.scheduled_posts.published_at IS 'Timestamp when dispatch succeeded';
COMMENT ON COLUMN public.scheduled_posts.external_id IS 'Provider campaign/broadcast ID';
COMMENT ON COLUMN public.scheduled_posts.last_error IS 'Last dispatch error message';
