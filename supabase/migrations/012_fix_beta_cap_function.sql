create or replace function public.enforce_beta_cap()
returns trigger
language plpgsql
security definer
as $$
declare
  user_count integer;
  cap integer;
begin
  select count(*) into user_count from public.profiles;

  -- if you have beta_settings table with a cap column, use it
  begin
    select cap into cap from public.beta_settings limit 1;
  exception when undefined_table then
    cap := 50;
  end;

  if user_count >= cap then
    raise exception 'Beta is full (% users).', cap;
  end if;

  return new;
end;
$$;
