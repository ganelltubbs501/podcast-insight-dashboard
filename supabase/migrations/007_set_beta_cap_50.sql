-- Reset beta cap to 50 users

create or replace function public.enforce_beta_cap()
returns trigger
language plpgsql
security definer
as $$
declare
  user_count integer;
begin
  select count(*) into user_count from public.profiles;

  if user_count >= 50 then
    raise exception 'Beta is full (50 users).';
  end if;

  return new;
end;
$$;
