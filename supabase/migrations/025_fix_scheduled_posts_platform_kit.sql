-- 025_fix_scheduled_posts_platform_kit.sql
-- Replace convertkit with kit in scheduled_posts platform constraint

ALTER TABLE public.scheduled_posts
DROP CONSTRAINT IF EXISTS scheduled_posts_platform_check;

ALTER TABLE public.scheduled_posts
ADD CONSTRAINT scheduled_posts_platform_check
CHECK (platform IN (
  'linkedin',
  'twitter',
  'tiktok',
  'youtube',
  'facebook',
  'medium',
  'teaser',
  'email',
  'kit',
  'mailchimp',
  'sendgrid',
  'beehiiv',
  'gohighlevel'
));

COMMENT ON COLUMN public.scheduled_posts.platform IS 'Target platform: linkedin, twitter, facebook, medium, email, kit, mailchimp, sendgrid, beehiiv, gohighlevel, etc.';
