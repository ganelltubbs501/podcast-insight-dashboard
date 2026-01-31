-- 022_add_email_crm_platforms.sql
-- Extend scheduled_posts platform constraint to include Email/CRM platforms

-- Drop the old constraint
ALTER TABLE public.scheduled_posts
DROP CONSTRAINT IF EXISTS scheduled_posts_platform_check;

-- Add new constraint with expanded platform list
ALTER TABLE public.scheduled_posts
ADD CONSTRAINT scheduled_posts_platform_check
CHECK (platform IN (
  -- Social media platforms
  'linkedin',
  'twitter',
  'tiktok',
  'youtube',
  'facebook',
  -- Content platforms
  'medium',
  'teaser',
  -- Legacy email
  'email',
  -- Email/CRM platforms (new)
  'kit',
  'mailchimp',
  'sendgrid',
  'beehiiv',
  'gohighlevel'
));

-- Add helpful comment
COMMENT ON COLUMN public.scheduled_posts.platform IS 'Target platform: linkedin, twitter, facebook, medium, email, kit, mailchimp, sendgrid, beehiiv, gohighlevel, etc.';
