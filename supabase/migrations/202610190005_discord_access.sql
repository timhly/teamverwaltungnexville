begin;
alter table public.profiles add column discord_id text unique;
alter table public.profiles add column discord_name text;

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  user_id uuid not null references public.profiles(id),
  discord_id text not null check(discord_id ~ '^[0-9]{5,30}$'),
  discord_name text not null check(length(discord_name) between 1 and 100),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  access_role text check(access_role in ('admin','editor','viewer')),
  decided_by uuid references public.profiles(id), decided_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,user_id)
);
create index access_requests_by_team on public.access_requests(team_id,status);
create index access_requests_by_user on public.access_requests(user_id);
create trigger stamp before update on public.access_requests for each row execute function public.stamp_version();
alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon,authenticated;
grant select on public.access_requests to authenticated;
create policy request_read on public.access_requests for select to authenticated
  using(user_id=auth.uid() or public.my_access(team_id)='admin');

-- Provider identifiers come from Supabase Auth identities, never user-editable metadata.
create function public.sync_discord_profile() returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); did text; dname text; display text; result jsonb;
begin
  if uid is null then raise exception 'Anmeldung erforderlich.' using errcode='42501'; end if;
  select provider_id, left(coalesce(nullif(identity_data->>'full_name',''),nullif(identity_data->>'name',''),nullif(identity_data->>'user_name',''),'Discord-Mitglied'),100)
    into did,dname from auth.identities where user_id=uid and provider='discord' limit 1;
  if did is not null and did !~ '^[0-9]{5,30}$' then raise exception 'Discord-Identität ist ungültig.' using errcode='22023'; end if;
  select left(coalesce(dname,nullif(raw_user_meta_data->>'display_name',''),nullif(split_part(email,'@',1),''),'Teammitglied'),100)
    into display from auth.users where id=uid;
  if not found then raise exception 'Konto nicht gefunden.' using errcode='42501'; end if;
  insert into public.profiles(id,display_name,discord_id,discord_name) values(uid,display,did,dname)
    on conflict(id) do update set discord_id=excluded.discord_id,discord_name=excluded.discord_name;
  select to_jsonb(p) into result from public.profiles p where id=uid;
  return result;
end $$;

create function public.request_team_access(p_team uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); t uuid:=p_team; profile jsonb; result jsonb;
begin
  profile:=public.sync_discord_profile();
  if profile->>'discord_id' is null then raise exception 'Bitte zuerst dein Discord-Konto verbinden.' using errcode='42501'; end if;
  if t is null then
    if (select count(*) from public.teams)<>1 then raise exception 'Bitte die Teamverwaltung um den passenden Teamzugang bitten.' using errcode='22023'; end if;
    select id into t from public.teams limit 1;
  end if;
  if not exists(select 1 from public.teams where id=t) then raise exception 'Team nicht gefunden.' using errcode='22023'; end if;
  if public.my_access(t) is not null then return jsonb_build_object('status','approved','team_id',t); end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||t::text,0));
  insert into public.access_requests(team_id,user_id,discord_id,discord_name)
    values(t,uid,profile->>'discord_id',profile->>'discord_name') on conflict(team_id,user_id) do update
      set discord_id=excluded.discord_id,discord_name=excluded.discord_name,status='pending',access_role=null,decided_by=null,decided_at=null
      where access_requests.discord_id<>excluded.discord_id and access_requests.status<>'approved';
  select to_jsonb(r) into result from public.access_requests r where team_id=t and user_id=uid;
  return result;
end $$;

create function public.review_access_request(p_team uuid,p_request uuid,p_expected integer,p_decision text,p_role text default 'viewer') returns jsonb
language plpgsql security definer set search_path='' as $$
declare req public.access_requests%rowtype; result jsonb; permission jsonb;
begin
  if auth.uid() is null or public.my_access(p_team) is distinct from 'admin' then raise exception 'Administratorrechte erforderlich.' using errcode='42501'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') or p_role is null or p_role not in ('admin','editor','viewer') or p_expected is null then
    raise exception 'Ungültige Freigabe.' using errcode='22023'; end if;
  select * into req from public.access_requests where id=p_request and team_id=p_team for update;
  if not found then raise exception 'Anfrage nicht gefunden.' using errcode='42501'; end if;
  if req.version<>p_expected or req.status='approved' then raise exception 'CONFLICT: Die Anfrage wurde bereits bearbeitet.' using errcode='40001'; end if;
  if p_decision='approved' then
    if not exists(select 1 from auth.identities where user_id=req.user_id and provider='discord' and provider_id=req.discord_id) then
      raise exception 'Die Discord-Identität hat sich geändert. Bitte eine neue Zugangsanfrage senden lassen.' using errcode='42501'; end if;
    -- Never overwrite an existing permission through the approval path.
    insert into public.user_permissions(team_id,user_id,access_role) values(p_team,req.user_id,p_role)
      on conflict(team_id,user_id) do nothing;
    select to_jsonb(p) into permission from public.user_permissions p where team_id=p_team and user_id=req.user_id;
  end if;
  update public.access_requests set status=p_decision, access_role=case when p_decision='approved' then permission->>'access_role' end,
    decided_by=auth.uid(),decided_at=now() where id=req.id returning to_jsonb(access_requests.*) into result;
  -- The request and permission write share one transaction. Audit only the decision, not pending personal details.
  insert into public.audit_logs(team_id,actor_id,actor_name,entity,entity_id,action,old_data,new_data)
    values(p_team,auth.uid(),coalesce((select display_name from public.profiles where id=auth.uid()),'Administrator'),
      'access_requests',req.id,'update',jsonb_build_object('status',req.status),
      jsonb_build_object('status',p_decision,'access_role',result->>'access_role'));
  return result;
end $$;
revoke all on function public.sync_discord_profile(),public.request_team_access(uuid),public.review_access_request(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.sync_discord_profile(),public.request_team_access(uuid),public.review_access_request(uuid,uuid,integer,text,text) to authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.access_requests;
  end if;
end $$;
commit;
