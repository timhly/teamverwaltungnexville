begin;
create function public.stamp_team_version() returns trigger language plpgsql set search_path = '' as $$
begin new.id:=old.id;new.created_at:=old.created_at;new.version:=old.version+1;new.updated_at:=clock_timestamp();return new;end $$;
create trigger stamp before update on public.teams for each row execute function public.stamp_team_version();
revoke all on function public.stamp_team_version() from public,anon,authenticated;

-- Called only from the authenticated invitation Edge Function using its server secret.
create function public.grant_invited_access(p_team uuid,p_user uuid,p_email text,p_name text,p_role text,p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.user_permissions where team_id=p_team and user_id=p_actor and access_role='admin') then raise exception 'Keine Administratorrechte.' using errcode='42501';end if;
  if not exists(select 1 from auth.users where id=p_user and lower(email)=lower(p_email)) then raise exception 'Ungültiger Einladungsempfänger.';end if;
  if p_role not in ('admin','editor','viewer') or length(trim(p_name)) not between 1 and 100 then raise exception 'Ungültige Einladung.';end if;
  -- Set the real initiating administrator as audit actor, never a value from browser claims.
  perform set_config('request.jwt.claim.sub',p_actor::text,true);
  insert into public.profiles(id,display_name) values(p_user,p_name) on conflict(id) do nothing;
  insert into public.user_permissions(team_id,user_id,access_role) values(p_team,p_user,p_role) on conflict(team_id,user_id) do nothing;
  insert into public.invitations(team_id,email,access_role,invited_by) values(p_team,lower(p_email),p_role,p_actor)
    on conflict(team_id,email) do update set created_at=now();
end $$;
revoke all on function public.grant_invited_access(uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.grant_invited_access(uuid,uuid,text,text,text,uuid) to service_role;
commit;
