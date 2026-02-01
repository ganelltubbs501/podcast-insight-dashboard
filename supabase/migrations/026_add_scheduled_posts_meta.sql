-- 026_add_scheduled_posts_meta.sql
-- Add meta column for provider-specific scheduling metadata

ALTER TABLE public.scheduled_posts
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS scheduled_posts_meta_idx
ON public.scheduled_posts USING gin (meta);

COMMENT ON COLUMN public.scheduled_posts.meta IS 'Provider-specific metadata for scheduled content (email automation triggers, etc.)';
