alter table public.podcasts
add column if not exists rss_url text;

create unique index if not exists podcasts_rss_url_unique
on public.podcasts (rss_url);
