begin;
alter table public.roles add column warning_exempt boolean not null default false;
update public.roles set warning_exempt=true where lower(trim(name)) in ('projektleitung','management');

-- This flag cannot be changed through mutate. Renaming a protected rank does not remove its protection.
create function public.protect_warning_rank() returns trigger language plpgsql set search_path='' as $$
begin
  new.warning_exempt:=new.warning_exempt or lower(trim(new.name)) in ('projektleitung','management');
  if TG_OP='UPDATE' then new.warning_exempt:=new.warning_exempt or old.warning_exempt; end if;
  return new;
end $$;
create trigger protect_warning_rank before insert or update on public.roles for each row execute function public.protect_warning_rank();

create function public.lock_warning_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_OP='DELETE' then
    perform 1 from public.team_members where id=old.member_id for update;
    return old;
  end if;
  perform 1 from public.team_members where id=new.member_id for update;
  return new;
end $$;
create trigger warning_member_lock before insert or update or delete on public.member_roles for each row execute function public.lock_warning_member();

create function public.guard_protected_warning() returns trigger language plpgsql security definer set search_path='' as $$
begin
  -- Historical records remain readable and may always be revoked.
  if TG_OP='UPDATE' and new.revoked then return new; end if;
  perform 1 from public.team_members where id=new.member_id for update;
  if exists(select 1 from public.member_roles mr join public.roles r on r.id=mr.role_id
    where mr.member_id=new.member_id and mr.team_id=new.team_id and r.warning_exempt) then
    raise exception 'Projektleitung und Management können keine Verwarnungen erhalten.' using errcode='23514';
  end if;
  return new;
end $$;
create trigger protected_warning before insert or update on public.warnings for each row execute function public.guard_protected_warning();

create function public.revoke_protected_warnings() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if TG_TABLE_NAME='member_roles' then
    if exists(select 1 from public.roles where id=new.role_id and warning_exempt) then
      update public.warnings set revoked=true where member_id=new.member_id and not revoked;
    end if;
  elsif new.warning_exempt then
    perform 1 from public.team_members where id in(select member_id from public.member_roles where role_id=new.id) order by id for update;
    update public.warnings set revoked=true where member_id in(select member_id from public.member_roles where role_id=new.id) and not revoked;
  end if;
  return new;
end $$;
create trigger revoke_on_protected_assignment after insert or update on public.member_roles for each row execute function public.revoke_protected_warnings();
create trigger revoke_on_protected_rank after update of warning_exempt on public.roles for each row execute function public.revoke_protected_warnings();
-- Renaming a rank can mark it protected even without an explicit update to warning_exempt.
create trigger revoke_on_rank_name after update of name on public.roles for each row execute function public.revoke_protected_warnings();

-- Correct existing records without deleting their audit trail or history.
update public.warnings w set revoked=true where not revoked and exists(
  select 1 from public.member_roles mr join public.roles r on r.id=mr.role_id where mr.member_id=w.member_id and r.warning_exempt
);
revoke all on function public.protect_warning_rank(),public.lock_warning_member(),public.guard_protected_warning(),public.revoke_protected_warnings() from public,anon,authenticated;
commit;
