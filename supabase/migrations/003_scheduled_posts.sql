-- Create scheduled_posts table for content calendar
create table if not exists scheduled_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  transcript_id uuid references transcripts(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'twitter', 'tiktok', 'youtube', 'email', 'medium', 'teaser')),
  content text not null,
  scheduled_date timestamptz not null,
  status text default 'Scheduled' check (status in ('Scheduled', 'Published', 'Failed')),
  metrics jsonb default null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Create index for faster queries
create index if not exists scheduled_posts_user_id_idx on scheduled_posts(user_id);
create index if not exists scheduled_posts_scheduled_date_idx on scheduled_posts(scheduled_date);
create index if not exists scheduled_posts_status_idx on scheduled_posts(status);

-- Enable Row Level Security
alter table scheduled_posts enable row level security;

-- Create RLS policies
create policy "Users can view their own scheduled posts"
  on scheduled_posts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scheduled posts"
  on scheduled_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own scheduled posts"
  on scheduled_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own scheduled posts"
  on scheduled_posts for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_scheduled_posts_updated_at
  before update on scheduled_posts
  for each row
  execute function update_updated_at_column();

-- Add helpful comment
comment on table scheduled_posts is 'Stores scheduled social media posts linked to podcast transcripts';
