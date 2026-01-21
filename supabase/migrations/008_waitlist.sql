create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  status text not null default 'waiting' check (status in ('waiting','invited','converted','removed')),
  source text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- optional: keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_waitlist_updated_at on public.waitlist;
create trigger trg_waitlist_updated_at
before update on public.waitlist
for each row execute function public.set_updated_at();

