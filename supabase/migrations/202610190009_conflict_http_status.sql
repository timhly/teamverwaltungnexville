begin;
-- 40001 is an engine serialization failure. PostgREST 14 retries it indefinitely.
-- Expected-version conflicts are business errors: return HTTP 409 without retrying.
-- Replace only this SQLSTATE in the installed definitions, retaining all existing
-- validation, atomic writes, idempotency, signatures, grants and security settings.
do $$
declare signature text; definition text; updated_definition text;
begin
  foreach signature in array array[
    'public.mutate(uuid,text,uuid,integer,jsonb,uuid,boolean)',
    'public.review_access_request(uuid,uuid,integer,text,text)'
  ] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    updated_definition:=replace(definition,'errcode=''40001''','errcode=''PT409''');
    if definition=updated_definition then
      raise exception 'Expected conflict SQLSTATE was not found in %. No changes applied.',signature;
    end if;
    execute updated_definition;
  end loop;
end $$;
notify pgrst, 'reload schema';
commit;
