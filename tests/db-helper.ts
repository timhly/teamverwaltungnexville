import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
export const ADMIN = "10000000-0000-4000-8000-000000000001";
export const EDITOR = "10000000-0000-4000-8000-000000000002";
export const VIEWER = "10000000-0000-4000-8000-000000000003";
export const OUTSIDER = "10000000-0000-4000-8000-000000000004";
export async function database() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);
    create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),provider text not null,provider_id text not null,identity_data jsonb default '{}'::jsonb,unique(provider,provider_id));
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
    insert into auth.users(id,email) values ('${ADMIN}','admin@example.test'),('${EDITOR}','editor@example.test'),('${VIEWER}','viewer@example.test'),('${OUTSIDER}','outsider@example.test');`);
  for (const name of [
    "202610190001_initial.sql",
    "202610190002_seed.sql",
    "202610190003_access_and_copy.sql",
    "202610190004_rank_order.sql",
    "202610190005_discord_access.sql",
    "202610190006_discord_admins.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
  const { rows } = await db.query<{ id: string }>(
    `select public.provision_team($1::uuid) id`,
    [ADMIN],
  );
  const team = rows[0].id;
  await db.query(
    `insert into public.profiles(id,display_name) values($1,'Bearbeiter'),($2,'Leser'),($3,'Extern')`,
    [EDITOR, VIEWER, OUTSIDER],
  );
  await db.query(
    `insert into public.user_permissions(team_id,user_id,access_role) values($1,$2,'editor'),($1,$3,'viewer')`,
    [team, EDITOR, VIEWER],
  );
  return { db, team };
}
export async function asUser<T>(
  db: PGlite,
  user: string,
  callback: () => Promise<T>,
  role = "authenticated",
) {
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [user]);
  await db.exec(`set role ${role}`);
  try {
    return await callback();
  } finally {
    await db.exec("reset role");
  }
}
