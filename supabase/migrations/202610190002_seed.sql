begin;
create function public.seed_team(t uuid) returns void language plpgsql security definer set search_path = '' as $$
declare m uuid; row record; role_name text;
begin
  if exists(select 1 from public.team_members where team_id=t) then return; end if;
  insert into public.roles(team_id,code,name,reference_count,color)
  select t,code,name,cnt,color from (values
    ('TS','Test Supporter',0,'#8ba9b3'),('S','Supporter',2,'#32cba7'),('SR. S','Senior Supporter',2,'#28bfd5'),
    ('M','Moderator',0,'#f0b85c'),('A','Administration',2,'#ef9385'),('HT','High Team',4,'#b7e568'),
    ('TV','Teamverwaltung',1,'#a5d65b'),('SL','Supportleitung',1,'#5dd4b3'),('ST','Sicherheitsteam',0,'#6da6da'),
    ('AN','Analyse',0,'#9da5c9'),('UV','Unternehmensverwaltung',3,'#75c9ad'),('FV','Fraktionsverwaltung',2,'#77add1'),
    ('MEN','Mentor',0,'#c7be7a'),('ENT','Entbannungsverwaltung',0,'#a0b7bd'),('RÜCK','Rückerstattungsverwaltung',0,'#b0a6c7'),
    ('EV','Eventverwaltung',0,'#d599ad'),('PL','Projektleitung',null,'#b6ef60'),('MG','Management',null,'#75dacf'),
    ('SR. M','Senior Moderator',null,'#f0c478'),('SV','Supportverwaltung',null,'#61cfb8'),('TL','Teamleitung',null,'#99d5e2')
  ) v(code,name,cnt,color);
  for row in select * from (values
    ('ApX',array['Projektleitung']),('Soon',array['Management']),('HAZE',array['Teamverwaltung']),
    ('Ivy',array['Supportverwaltung','Unternehmensverwaltung']),('Cherry',array['Senior Supporter','Fraktionsverwaltung']),
    ('Moon',array['Supporter','Unternehmensverwaltung']),('Smok',array['Senior Supporter','Fraktionsverwaltung']),
    ('Birne',array['Senior Moderator','Unternehmensverwaltung']),('Weedy',array['Supporter'])
  ) v(name,roles) loop
    insert into public.team_members(team_id,name) values(t,row.name) returning id into m;
    foreach role_name in array row.roles loop
      insert into public.member_roles(team_id,member_id,role_id) select t,m,id from public.roles where team_id=t and name=role_name;
    end loop;
  end loop;
end $$;
revoke all on function public.seed_team(uuid) from public,anon,authenticated;
commit;
