begin;
-- Only these two current rank names are exempt. Application administrator access is unrelated.
create or replace function public.protect_warning_rank() returns trigger language plpgsql set search_path='' as $$
begin
  new.warning_exempt:=lower(trim(new.name)) in ('projektleitung','management');
  return new;
end $$;
update public.roles set warning_exempt=lower(trim(name)) in ('projektleitung','management')
  where warning_exempt is distinct from (lower(trim(name)) in ('projektleitung','management'));

create table public.discord_display_names (
  discord_id text primary key,
  display_name text not null check(length(display_name) between 1 and 100)
);
alter table public.discord_display_names enable row level security;
revoke all on public.discord_display_names from public,anon,authenticated;
insert into public.discord_display_names values
  ('470653391094415362','Smok'),
  ('622043290321289216','HAZE'),
  ('480337195878711307','Soon'),
  ('305666557219176449','Apx'),
  ('433674403394486275','Ivy');

create function public.apply_discord_display_name() returns trigger
language plpgsql security definer set search_path='' as $$
declare alias_name text;
begin
  select a.display_name into alias_name from auth.identities i join public.discord_display_names a on a.discord_id=i.provider_id
    where i.user_id=new.id and i.provider='discord' and i.provider_id=new.discord_id limit 1;
  if alias_name is not null then new.display_name:=alias_name; new.discord_name:=alias_name; end if;
  return new;
end $$;
revoke all on function public.apply_discord_display_name() from public,anon,authenticated;
create trigger discord_display_name before insert or update on public.profiles
  for each row execute function public.apply_discord_display_name();

-- Update existing accounts and author labels. Provider-owned identities remain unchanged.
update public.profiles p set discord_id=i.provider_id,display_name=a.display_name,discord_name=a.display_name
  from auth.identities i join public.discord_display_names a on a.discord_id=i.provider_id
  where i.provider='discord' and i.user_id=p.id;
update public.audit_logs l set actor_name=a.display_name
  from auth.identities i join public.discord_display_names a on a.discord_id=i.provider_id
  where i.provider='discord' and i.user_id=l.actor_id and l.actor_name is distinct from a.display_name;
update public.access_requests r set discord_name=a.display_name
  from auth.identities i join public.discord_display_names a on a.discord_id=i.provider_id
  where i.provider='discord' and i.user_id=r.user_id and i.provider_id=r.discord_id and r.discord_name is distinct from a.display_name;
commit;
