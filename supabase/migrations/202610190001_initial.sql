-- Nexville Roleplay: relational application schema. Apply as database owner.
begin;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nexville Roleplay' check(length(trim(name)) between 1 and 100),
  timezone text not null default 'Europe/Berlin' check(timezone = 'Europe/Berlin'),
  version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check(length(display_name) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.user_permissions (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  user_id uuid not null references public.profiles(id),
  access_role text not null check(access_role in ('admin','editor','viewer')),
  modules text[] not null default array['members','meetings','warnings','wishes']::text[]
    check(modules <@ array['members','roles','meetings','warnings','wishes']::text[]),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,user_id)
);
create table public.team_members (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  name text not null check(length(trim(name)) between 1 and 80),
  info text not null default '' check(length(info)<=10000), notes text not null default '' check(length(notes)<=20000),
  joined_on date, status text not null default 'active' check(status in ('active','inactive','archived')),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,id)
);
create unique index member_names on public.team_members(team_id,lower(name)) where status <> 'archived';
create table public.roles (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  name text not null check(length(trim(name)) between 1 and 100), code text not null check(length(trim(code)) between 1 and 12),
  color text not null default '#34d6bf' check(color ~ '^#[0-9a-fA-F]{6}$'),
  description text not null default '' check(length(description)<=5000), reference_count integer check(reference_count>=0),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,id), unique(team_id,name),unique(team_id,code)
);
create table public.member_roles (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  member_id uuid not null, role_id uuid not null,
  foreign key(team_id,member_id) references public.team_members(team_id,id) on delete restrict,
  foreign key(team_id,role_id) references public.roles(team_id,id) on delete restrict,
  unique(member_id,role_id)
);
create table public.meetings (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  title text not null check(length(trim(title)) between 1 and 200), starts_at timestamptz not null,
  leader_id uuid, status text not null default 'planned' check(status in ('planned','completed','archived')),
  notes text not null default '' check(length(notes)<=30000), results text not null default '' check(length(results)<=30000),
  decisions text not null default '' check(length(decisions)<=30000),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(team_id,id), foreign key(team_id,leader_id) references public.team_members(team_id,id)
);
create table public.meeting_topics (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), meeting_id uuid not null,
  position integer not null check(position between 1 and 10000), title text not null default '' check(length(title)<=5000),
  done boolean not null default false, responsible_id uuid,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(team_id,meeting_id) references public.meetings(team_id,id) on delete restrict,
  foreign key(team_id,responsible_id) references public.team_members(team_id,id), unique(meeting_id,position)
);
create table public.meeting_attendance (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), meeting_id uuid not null,
  member_id uuid not null, name_snapshot text not null, roles_snapshot jsonb not null default '[]'::jsonb,
  status text not null default 'open' check(status in ('open','present','registered','absent')),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(team_id,meeting_id) references public.meetings(team_id,id) on delete restrict,
  foreign key(team_id,member_id) references public.team_members(team_id,id), unique(meeting_id,member_id)
);
create table public.warnings (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id), member_id uuid not null,
  level integer not null check(level between 1 and 3), reason text not null check(length(trim(reason)) between 1 and 5000),
  info text not null default '' check(length(info)<=10000), starts_on date not null, expires_on date,
  revoked boolean not null default false,
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(team_id,member_id) references public.team_members(team_id,id), check(expires_on is null or expires_on>=starts_on)
);
create table public.team_wishes (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  title text not null check(length(trim(title)) between 1 and 200), description text not null default '' check(length(description)<=10000),
  submitted_by uuid, priority text not null default 'normal' check(priority in ('low','normal','high')),
  status text not null default 'open' check(status in ('open','progress','accepted','rejected','done','archived')),
  internal_note text not null default '' check(length(internal_note)<=10000),
  version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(team_id,submitted_by) references public.team_members(team_id,id)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  actor_id uuid, actor_name text not null, entity text not null, entity_id uuid not null,
  action text not null, old_data jsonb, new_data jsonb, created_at timestamptz not null default now()
);
create table public.mutation_receipts (
  user_id uuid not null, operation_id uuid not null, team_id uuid not null references public.teams(id),
  request jsonb not null, response jsonb not null, created_at timestamptz not null default now(),
  primary key(user_id,operation_id)
);
create table public.invitations (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id),
  email text not null check(length(email)<=254), access_role text not null check(access_role in ('admin','editor','viewer')),
  invited_by uuid not null, accepted_at timestamptz, created_at timestamptz not null default now(),
  unique(team_id,email)
);

create function public.my_access(t uuid) returns text language sql stable security definer set search_path = '' as $$
  select access_role from public.user_permissions where team_id=t and user_id=auth.uid()
$$;
create function public.can_edit(t uuid, m text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_permissions where team_id=t and user_id=auth.uid()
    and (access_role='admin' or (access_role='editor' and m=any(modules))))
$$;
create function public.stamp_version() returns trigger language plpgsql set search_path = '' as $$
begin
  new.id:=old.id; new.team_id:=old.team_id; new.created_at:=old.created_at;
  new.version:=old.version+1; new.updated_at:=clock_timestamp(); return new;
end $$;
create function public.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare rowdata jsonb := case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end; tid uuid;
begin
  tid := case when TG_TABLE_NAME='teams' then (rowdata->>'id')::uuid else (rowdata->>'team_id')::uuid end;
  insert into public.audit_logs(team_id,actor_id,actor_name,entity,entity_id,action,old_data,new_data)
    values(tid,auth.uid(),coalesce((select display_name from public.profiles where id=auth.uid()),'System'),TG_TABLE_NAME,
      (rowdata->>'id')::uuid,lower(TG_OP),
      case when TG_OP<>'INSERT' then case when TG_TABLE_NAME='invitations' then to_jsonb(old)-'email' else to_jsonb(old) end end,
      case when TG_OP<>'DELETE' then case when TG_TABLE_NAME='invitations' then to_jsonb(new)-'email' else to_jsonb(new) end end);
  return coalesce(new,old);
end $$;
do $$ declare tbl text; begin
  foreach tbl in array array['team_members','roles','meetings','meeting_topics','meeting_attendance','warnings','team_wishes','user_permissions'] loop
    execute format('create trigger stamp before update on public.%I for each row execute function public.stamp_version()',tbl);
  end loop;
  foreach tbl in array array['teams','team_members','roles','member_roles','meetings','meeting_topics','meeting_attendance','warnings','team_wishes','user_permissions','invitations'] loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_change()',tbl);
  end loop;
  foreach tbl in array array['team_members','roles','member_roles','meetings','meeting_topics','meeting_attendance','warnings','team_wishes','user_permissions','audit_logs','invitations','mutation_receipts'] loop
    execute format('alter table public.%I enable row level security',tbl);
    execute format('revoke all on public.%I from anon, authenticated',tbl);
    if tbl not in ('mutation_receipts','invitations') then
      execute format('grant select on public.%I to authenticated',tbl);
      execute format('create policy team_read on public.%I for select to authenticated using (public.my_access(team_id) is not null)',tbl);
    end if;
    execute format('create index on public.%I(team_id)',tbl);
  end loop;
end $$;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
revoke all on public.teams,public.profiles from anon,authenticated;
grant select on public.teams,public.profiles to authenticated;
create policy team_read on public.teams for select to authenticated using(public.my_access(id) is not null);
create policy profile_read on public.profiles for select to authenticated using(
  id=auth.uid() or exists(select 1 from public.user_permissions p where p.user_id=profiles.id and public.my_access(p.team_id) is not null)
);
create index audit_by_time on public.audit_logs(team_id,created_at desc);
create index warning_by_member on public.warnings(team_id,member_id,expires_on);
create index meeting_by_time on public.meetings(team_id,starts_at desc);
create index topics_by_meeting on public.meeting_topics(meeting_id,position);
create index attendance_by_meeting on public.meeting_attendance(meeting_id);

-- A single mutation is an atomic transaction; writes cannot bypass permissions,
-- version checks, audit logging or idempotency through the REST table endpoints.
create function public.mutate(
  p_team uuid, p_table text, p_id uuid, p_expected integer, p_patch jsonb,
  p_operation uuid, p_delete boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  allowed text[]; module_name text; current_row jsonb; result jsonb; payload jsonb; fields text; vals text; assignments text;
  saved public.mutation_receipts%rowtype; role_ids jsonb; patch jsonb:=p_patch; rid uuid; aid uuid:=auth.uid(); copy_source uuid;
begin
  if aid is null or public.my_access(p_team) is null then raise exception 'Kein Zugriff.' using errcode='42501'; end if;
  if p_operation is null or p_id is null or p_expected is null or p_expected<0 or patch is null or p_delete is null or jsonb_typeof(patch)<>'object' then raise exception 'Ungültige Anfrage.' using errcode='22023'; end if;
  case p_table
    when 'team_members' then module_name:='members'; allowed:=array['name','info','notes','joined_on','status','role_ids'];
    when 'roles' then module_name:='roles'; allowed:=array['name','code','color','description','kind','sort_order'];
    when 'meetings' then module_name:='meetings'; allowed:=array['title','starts_at','leader_id','status','notes','results','decisions','copy_source'];
    when 'meeting_topics' then module_name:='meetings'; allowed:=array['meeting_id','position','title','done','responsible_id'];
    when 'meeting_attendance' then module_name:='meetings'; allowed:=array['status'];
    when 'warnings' then module_name:='warnings'; allowed:=array['member_id','level','reason','info','starts_on','expires_on','revoked'];
    when 'team_wishes' then module_name:='wishes'; allowed:=array['title','description','submitted_by','priority','status','internal_note'];
    when 'teams' then module_name:='admin'; allowed:=array['name'];
    when 'user_permissions' then module_name:='admin'; allowed:=array['access_role','modules'];
    else raise exception 'Unbekannte Tabelle.' using errcode='22023';
  end case;
  if (module_name='admin' and public.my_access(p_team)<>'admin') or
    (module_name<>'admin' and not public.can_edit(p_team,module_name)) then raise exception 'Keine Schreibberechtigung.' using errcode='42501'; end if;
  if exists(select 1 from jsonb_object_keys(patch) k where not k=any(allowed)) or octet_length(patch::text)>100000 then
    raise exception 'Ungültige Felder.' using errcode='22023'; end if;
  payload:=jsonb_build_object('table',p_table,'id',p_id,'expected',p_expected,'patch',patch,'delete',p_delete);
  perform pg_advisory_xact_lock(hashtextextended(aid::text||p_operation::text,0));
  select * into saved from public.mutation_receipts where user_id=aid and operation_id=p_operation;
  if found then
    if saved.request<>payload or saved.team_id<>p_team then raise exception 'Operation-ID bereits verwendet.' using errcode='22023'; end if;
    return saved.response;
  end if;
  if p_table='teams' then
    select to_jsonb(t) into current_row from public.teams t where id=p_id and id=p_team for update;
  else
    execute format('select to_jsonb(t) from public.%I t where id=$1 and team_id=$2 for update',p_table) into current_row using p_id,p_team;
  end if;
  if (p_expected=0 and current_row is not null) or (p_expected>0 and (current_row is null or (current_row->>'version')::int<>p_expected)) then
    raise exception 'CONFLICT: Der Datensatz wurde zwischenzeitlich geändert.' using errcode='40001';
  end if;
  if p_table='user_permissions' then
    perform 1 from public.teams where id=p_team for update;
    if current_row->>'access_role'='admin' and (p_delete or (patch ? 'access_role' and patch->>'access_role'<>'admin'))
      and (select count(*) from public.user_permissions where team_id=p_team and access_role='admin')<=1 then
      raise exception 'Der letzte Administrator kann nicht entfernt oder herabgestuft werden.' using errcode='23514'; end if;
  end if;
  if patch ? 'copy_source' then
    if p_table<>'meetings' or p_expected<>0 then raise exception 'Kopieren nur beim Anlegen einer Besprechung erlaubt.'; end if;
    copy_source:=(patch->>'copy_source')::uuid; patch:=patch-'copy_source';
    if not exists(select 1 from public.meetings where team_id=p_team and id=copy_source) then raise exception 'Quellbesprechung nicht gefunden.' using errcode='42501'; end if;
  end if;
  if p_delete then
    if public.my_access(p_team)<>'admin' or p_table not in ('roles','team_wishes','user_permissions') or p_expected=0 then
      raise exception 'Bitte archivieren Sie diesen Datensatz.' using errcode='42501'; end if;
    execute format('delete from public.%I where id=$1 and team_id=$2',p_table) using p_id,p_team;
    result:=jsonb_build_object('id',p_id,'deleted',true);
  else
    if p_table in ('teams','user_permissions','meeting_attendance') and p_expected=0 then raise exception 'Anlegen hier nicht erlaubt.'; end if;
    if p_table='team_members' and patch ? 'role_ids' then
      role_ids:=patch->'role_ids'; patch:=patch-'role_ids';
      if jsonb_typeof(role_ids)<>'array' or jsonb_array_length(role_ids)>100 then raise exception 'Ungültige Rollen.'; end if;
    end if;
    if p_expected>0 and p_table in ('meeting_topics','warnings') then
      patch:=patch-case when p_table='meeting_topics' then 'meeting_id' else 'member_id' end;
    end if;
    select string_agg(format('%I',key),','),string_agg(format('x.%I',key),','),string_agg(format('%I=x.%I',key,key),',')
      into fields,vals,assignments from jsonb_object_keys(patch) key;
    if p_expected=0 then
      patch:=patch||jsonb_build_object('id',p_id,'team_id',p_team);
      fields:=concat_ws(',',fields,'id','team_id'); vals:=concat_ws(',',vals,'x.id','x.team_id');
      execute format('insert into public.%1$I (%2$s) select %3$s from jsonb_populate_record(null::public.%1$I,$1) x returning to_jsonb(%1$I.*)',p_table,fields,vals)
        into result using patch;
    elsif assignments is not null then
      execute format('update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I,$1) x where t.id=$2 returning to_jsonb(t.*)',p_table,assignments)
        into result using patch,p_id;
    else
      -- A role-only edit still advances the member version.
      execute format('update public.%1$I set updated_at=now() where id=$1 returning to_jsonb(%1$I.*)',p_table) into result using p_id;
    end if;
    if role_ids is not null then
      delete from public.member_roles where member_id=p_id and team_id=p_team and role_id not in(select value::uuid from jsonb_array_elements_text(role_ids));
      for rid in select distinct value::uuid from jsonb_array_elements_text(role_ids) loop
        insert into public.member_roles(team_id,member_id,role_id) values(p_team,p_id,rid) on conflict(member_id,role_id) do nothing;
      end loop;
    end if;
    if p_table='meetings' and p_expected=0 then
      if copy_source is null then
        insert into public.meeting_topics(team_id,meeting_id,position) select p_team,p_id,generate_series(1,13);
      else
        insert into public.meeting_topics(team_id,meeting_id,position,title,responsible_id)
          select p_team,p_id,position,title,responsible_id from public.meeting_topics where team_id=p_team and meeting_id=copy_source;
      end if;
      insert into public.meeting_attendance(team_id,meeting_id,member_id,name_snapshot,roles_snapshot)
        select p_team,p_id,m.id,m.name,coalesce((select jsonb_agg(r.name order by case r.kind when 'rank' then 0 when 'extra' then 1 else 2 end,r.sort_order,r.name) from public.roles r
          join public.member_roles mr on mr.role_id=r.id where mr.member_id=m.id),'[]'::jsonb)
        from public.team_members m where m.team_id=p_team and m.status='active';
    end if;
  end if;
  insert into public.mutation_receipts(user_id,operation_id,team_id,request,response) values(aid,p_operation,p_team,payload,result);
  return result;
end $$;

-- Server-authoritative warning activity. An expiration date includes its entire Berlin calendar day.
create view public.warning_status with (security_invoker=true) as
  select w.*, (not revoked and starts_on <= (now() at time zone 'Europe/Berlin')::date
    and (expires_on is null or expires_on >= (now() at time zone 'Europe/Berlin')::date)) as active from public.warnings w;
revoke all on public.warning_status from anon,authenticated;
grant select on public.warning_status to authenticated;

-- Prevent unauthenticated execution of security-definer entry points.
revoke execute on function public.my_access(uuid),public.can_edit(uuid,text),public.stamp_version(),public.audit_change(),public.mutate(uuid,text,uuid,integer,jsonb,uuid,boolean) from public,anon,authenticated;
grant execute on function public.my_access(uuid),public.can_edit(uuid,text),public.mutate(uuid,text,uuid,integer,jsonb,uuid,boolean) to authenticated;

-- Only the database owner can run initial provisioning; never exposed to the browser.
create function public.provision_team(p_owner uuid, p_name text default 'Nexville Roleplay') returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid; n text;
begin
  if exists(select 1 from public.user_permissions where user_id=p_owner) then raise exception 'Benutzer wurde bereits eingerichtet.'; end if;
  select coalesce(raw_user_meta_data->>'display_name',split_part(email,'@',1),'Administrator') into n from auth.users where id=p_owner;
  if not found then raise exception 'Auth-Benutzer nicht gefunden.'; end if;
  insert into public.profiles(id,display_name) values(p_owner,n) on conflict(id) do nothing;
  insert into public.teams(name) values(p_name) returning id into t;
  insert into public.user_permissions(team_id,user_id,access_role) values(t,p_owner,'admin');
  perform public.seed_team(t);
  return t;
end $$;
revoke all on function public.provision_team(uuid,text) from public,anon,authenticated;

-- Realtime uses append-only audit records; RLS applies to subscriber access.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
end $$;
commit;
