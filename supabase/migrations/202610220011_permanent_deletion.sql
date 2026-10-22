begin;
-- Keep the existing authorization, version checks, idempotency and audit path.
-- Only administrators can delete these records. No existing data is deleted here.
do $$
declare definition text; updated_definition text;
begin
  definition := pg_get_functiondef('public.mutate(uuid,text,uuid,integer,jsonb,uuid,boolean)'::regprocedure);
  updated_definition := replace(definition,
    'p_table not in (''roles'',''team_wishes'',''user_permissions'')',
    'p_table not in (''roles'',''team_wishes'',''user_permissions'',''team_members'',''meetings'')');
  if updated_definition = definition then
    raise exception 'Expected deletion permission check not found. No changes applied.';
  end if;
  definition := updated_definition;
  updated_definition := replace(definition,
    'execute format(''delete from public.%I where id=$1 and team_id=$2'',p_table) using p_id,p_team;',
    'if p_table=''team_members'' then
      delete from public.member_roles where team_id=p_team and member_id=p_id;
      delete from public.warnings where team_id=p_team and member_id=p_id;
      delete from public.meeting_attendance where team_id=p_team and member_id=p_id;
      update public.meetings set leader_id=null where team_id=p_team and leader_id=p_id;
      update public.meeting_topics set responsible_id=null where team_id=p_team and responsible_id=p_id;
      update public.team_wishes set submitted_by=null where team_id=p_team and submitted_by=p_id;
    elsif p_table=''meetings'' then
      delete from public.meeting_topics where team_id=p_team and meeting_id=p_id;
      delete from public.meeting_attendance where team_id=p_team and meeting_id=p_id;
    end if;
    execute format(''delete from public.%I where id=$1 and team_id=$2'',p_table) using p_id,p_team;');
  if updated_definition = definition then
    raise exception 'Expected deletion statement not found. No changes applied.';
  end if;
  execute updated_definition;
end $$;
notify pgrst, 'reload schema';
commit;
