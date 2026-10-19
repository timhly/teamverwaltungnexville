begin;

-- Only the database owner can change this explicit list of trusted Discord accounts.
create table public.discord_admin_allowlist (
  discord_id text primary key check(discord_id ~ '^[0-9]{5,30}$')
);
alter table public.discord_admin_allowlist enable row level security;
revoke all on public.discord_admin_allowlist from public,anon,authenticated;
insert into public.discord_admin_allowlist(discord_id) values
  ('470653391094415362'),
  ('622043290321289216'),
  ('433674403394486275'),
  ('480337195878711307'),
  ('305666557219176449');

create function public.grant_verified_discord_admin() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if new.discord_id is null or not exists (
    select 1 from public.discord_admin_allowlist a join auth.identities i on i.provider_id=a.discord_id
    where a.discord_id=new.discord_id and i.provider='discord' and i.user_id=new.id
  ) then return new; end if;
  -- Never grant access to other teams or guess between duplicate Nexville workspaces.
  if (select count(*) from public.teams where lower(trim(name))='nexville roleplay')<>1 then return new; end if;
  select id into target from public.teams where lower(trim(name))='nexville roleplay';
  insert into public.user_permissions(team_id,user_id,access_role) values(target,new.id,'admin')
    on conflict(team_id,user_id) do update set access_role='admin'
      where user_permissions.access_role<>'admin';
  return new;
end $$;
revoke all on function public.grant_verified_discord_admin() from public,anon,authenticated;
create trigger verified_discord_admin after insert or update of discord_id on public.profiles
  for each row execute function public.grant_verified_discord_admin();

-- Apply to verified accounts that already exist, as well as future sign-ins via profile sync.
insert into public.profiles(id,display_name,discord_id,discord_name)
  select i.user_id,
    left(coalesce(nullif(i.identity_data->>'full_name',''),nullif(i.identity_data->>'name',''),'Discord-Mitglied'),100),
    i.provider_id,
    left(coalesce(nullif(i.identity_data->>'full_name',''),nullif(i.identity_data->>'name',''),'Discord-Mitglied'),100)
  from auth.identities i join public.discord_admin_allowlist a on a.discord_id=i.provider_id
  where i.provider='discord'
  on conflict(id) do update set discord_id=excluded.discord_id,discord_name=excluded.discord_name;

commit;
