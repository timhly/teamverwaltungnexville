begin;
alter table public.roles add column kind text not null default 'legacy' check(kind in ('rank','extra','legacy'));
alter table public.roles add column sort_order integer not null default 500 check(sort_order between 0 and 10000);
-- Preserve role UUIDs, member assignments, historical audit data and meeting snapshots.
update public.roles set name=case name when 'Sr. Moderation' then 'Senior Moderator' when 'Moderation' then 'Moderator' when 'Probe Supporter' then 'Test Supporter' else name end;
update public.roles set kind='rank',sort_order=array_position(array['Projektleitung','Management','Administration','Senior Moderator','Moderator','Senior Supporter','Supporter','Test Supporter'],name)-1
  where name=any(array['Projektleitung','Management','Administration','Senior Moderator','Moderator','Senior Supporter','Supporter','Test Supporter']);
update public.roles set kind='extra',sort_order=array_position(array['Fraktionsverwaltung','Unternehmensverwaltung','Eventverwaltung','Supportleitung','Teamleitung'],name)-1
  where name=any(array['Fraktionsverwaltung','Unternehmensverwaltung','Eventverwaltung','Supportleitung','Teamleitung']);
update public.roles set kind='legacy',sort_order=500 where name<>all(array['Projektleitung','Management','Administration','Senior Moderator','Moderator','Senior Supporter','Supporter','Test Supporter','Fraktionsverwaltung','Unternehmensverwaltung','Eventverwaltung','Supportleitung','Teamleitung']);
insert into public.roles(team_id,name,code,color,kind,sort_order)
  select id,'Teamleitung','TL','#99d5e2','extra',4 from public.teams
  where not exists(select 1 from public.roles where team_id=teams.id and name='Teamleitung');

-- Apply the same mapping to every newly provisioned team.
create function public.classify_seed_role() returns trigger language plpgsql set search_path='' as $$
declare rank_names text[]:=array['Projektleitung','Management','Administration','Senior Moderator','Moderator','Senior Supporter','Supporter','Test Supporter'];extra_names text[]:=array['Fraktionsverwaltung','Unternehmensverwaltung','Eventverwaltung','Supportleitung','Teamleitung'];
begin
  new.name:=case new.name when 'Sr. Moderation' then 'Senior Moderator' when 'Moderation' then 'Moderator' when 'Probe Supporter' then 'Test Supporter' else new.name end;
  if new.name=any(rank_names) then new.kind:='rank';new.sort_order:=array_position(rank_names,new.name)-1;
  elsif new.name=any(extra_names) then new.kind:='extra';new.sort_order:=array_position(extra_names,new.name)-1;
  end if;
  return new;
end $$;
create trigger classify before insert or update of name on public.roles for each row execute function public.classify_seed_role();
revoke all on function public.classify_seed_role() from public,anon,authenticated;
commit;
