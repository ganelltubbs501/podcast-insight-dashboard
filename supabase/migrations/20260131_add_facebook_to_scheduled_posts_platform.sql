-- Allow facebook in scheduled_posts.platform check constraint
alter table scheduled_posts
  drop constraint if exists scheduled_posts_platform_check;

alter table scheduled_posts
  add constraint scheduled_posts_platform_check
  check (platform in ('linkedin', 'twitter', 'tiktok', 'youtube', 'email', 'medium', 'teaser', 'facebook'));
