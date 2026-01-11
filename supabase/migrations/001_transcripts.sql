-- 001_transcripts.sql
-- Creates transcripts table

create table if not exists public.transcripts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,

  title text,
  content text not null,

  status text default 'new',
  result jsonb default '{}'::jsonb,
  settings jsonb default '{}'::jsonb,

  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists transcripts_user_id_idx on public.transcripts (user_id);
create index if not exists transcripts_created_at_idx on public.transcripts (created_at);
