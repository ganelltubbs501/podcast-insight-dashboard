-- 024_upgrade_scheduled_posts_email.sql
-- Upgrade scheduled_posts for email providers + cron outcomes

-- A) Add columns (safe)
alter table public.scheduled_posts
  add column if not exists provider text,
  add column if not exists title text,
  add column if not exists content_html text,
  add column if not exists external_id text,
  add column if not exists last_error text,
  add column if not exists manual_action_url text,
  add column if not exists provider_account_id text;

-- B) Expand status options (drop old constraint, add new)
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.scheduled_posts'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%in%Scheduled%Published%Failed%';

  if cname is not null then
    execute format('alter table public.scheduled_posts drop constraint %I', cname);
  end if;
end $$;

alter table public.scheduled_posts
  add constraint scheduled_posts_status_check
  check (status in ('Scheduled', 'Published', 'Failed', 'NeedsManualSend'));

-- C) Optional provider constraint (uncomment if desired)
-- alter table public.scheduled_posts
--   add constraint scheduled_posts_provider_check
--   check (
--     provider is null
--     or provider in ('kit', 'gmail', 'sendgrid', 'mailchimp', 'beehiiv', 'gohighlevel')
--   );
