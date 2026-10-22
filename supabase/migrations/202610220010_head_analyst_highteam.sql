begin;

create or replace function public.classify_seed_role() returns trigger language plpgsql set search_path='' as $$
declare
  rank_names text[]:=array['Projektleitung','Management','HighTeam','Administration','Senior Moderator','Moderator','Senior Supporter','Supporter','Test Supporter'];
  extra_names text[]:=array['Fraktionsverwaltung','Unternehmensverwaltung','Eventverwaltung','Supportleitung','Teamleitung','Head-Analyst'];
begin
  new.name:=case lower(trim(new.name))
    when 'high team' then 'HighTeam' when 'highteam' then 'HighTeam'
    when 'head-analyst' then 'Head-Analyst'
    else case new.name when 'Sr. Moderation' then 'Senior Moderator' when 'Moderation' then 'Moderator' when 'Probe Supporter' then 'Test Supporter' else new.name end end;
  if new.name=any(rank_names) then new.kind:='rank';new.sort_order:=array_position(rank_names,new.name)-1;
  elsif new.name=any(extra_names) then new.kind:='extra';new.sort_order:=array_position(extra_names,new.name)-1;
  end if;
  return new;
end $$;

-- Reuse existing UUIDs and assignments, including the original legacy "High Team" role.
update public.roles set name='HighTeam',color='#7dd3fc',kind='rank',sort_order=2
  where lower(trim(name)) in ('high team','highteam');
update public.roles set sort_order=array_position(array['Projektleitung','Management','HighTeam','Administration','Senior Moderator','Moderator','Senior Supporter','Supporter','Test Supporter'],name)-1
  where name=any(array['Projektleitung','Management','HighTeam','Administration','Senior Moderator','Moderator','Senior Supporter','Supporter','Test Supporter']);

insert into public.roles(team_id,name,code,color,kind,sort_order)
  select id,'HighTeam','HT','#7dd3fc','rank',2 from public.teams
  where not exists(select 1 from public.roles where team_id=teams.id and name='HighTeam');
update public.roles set name='Head-Analyst',color='#a78bfa',kind='extra',sort_order=5
  where lower(trim(name))='head-analyst';
insert into public.roles(team_id,name,code,color,kind,sort_order)
  select id,'Head-Analyst','HA','#a78bfa','extra',5 from public.teams
  where not exists(select 1 from public.roles where team_id=teams.id and name='Head-Analyst');

-- The existing seed includes High Team. Add Head-Analyst for future workspaces too.
create function public.seed_head_analyst_role() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.roles(team_id,name,code,color,kind,sort_order)
    values(new.id,'Head-Analyst','HA','#a78bfa','extra',5);
  return new;
end $$;
create trigger seed_head_analyst after insert on public.teams for each row execute function public.seed_head_analyst_role();
revoke all on function public.seed_head_analyst_role() from public,anon,authenticated;

-- Use the requested light blue when the original seed creates High Team in a new workspace.
create function public.seed_highteam_color() returns trigger language plpgsql set search_path='' as $$
begin
  if new.name='HighTeam' then new.color:='#7dd3fc'; end if;
  return new;
end $$;
create trigger seed_highteam_color before insert on public.roles for each row execute function public.seed_highteam_color();
revoke all on function public.seed_highteam_color() from public,anon,authenticated;
commit;
