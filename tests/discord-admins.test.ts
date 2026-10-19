import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN, OUTSIDER, asUser, database } from "./db-helper";

describe("Explicit verified Discord administrators", () => {
  let db: PGlite, team: string, other: string;
  beforeAll(async () => {
    ({ db, team } = await database());
    other = (
      await db.query<{ id: string }>(
        "insert into public.teams(name) values('Anderes Team') returning id",
      )
    ).rows[0].id;
  });
  afterAll(async () => {
    await db.close();
  });
  it.each([
    "470653391094415362",
    "622043290321289216",
    "433674403394486275",
    "480337195878711307",
    "305666557219176449",
  ])(
    "grants %s administrator rights directly and idempotently, only in Nexville",
    async (discordId) => {
      const uid = randomUUID();
      await db.query("insert into auth.users(id,email) values($1,$2)", [
        uid,
        `${discordId}@example.test`,
      ]);
      await db.query(
        "insert into auth.identities(user_id,provider,provider_id,identity_data) values($1,'discord',$2,'{\"full_name\":\"Freigegebener Admin\"}')",
        [uid, discordId],
      );
      // The first allowlisted account already has viewer access: the login must promote it.
      if (discordId === "470653391094415362") {
        await db.query(
          "insert into public.profiles(id,display_name) values($1,'Bestehendes Konto')",
          [uid],
        );
        await db.query(
          "insert into public.user_permissions(team_id,user_id,access_role) values($1,$2,'viewer')",
          [team, uid],
        );
      }
      await asUser(db, uid, async () => {
        await db.query("select public.sync_discord_profile()");
        const { rows } = await db.query<{
          access_role: string;
          team_id: string;
          version: number;
        }>("select * from public.user_permissions where user_id=$1", [uid]);
        expect(rows).toHaveLength(1);
        expect(rows[0].access_role).toBe("admin");
        expect(rows[0].team_id).toBe(team);
        expect(rows[0].team_id).not.toBe(other);
        expect(
          (
            await db.query(
              "select * from public.access_requests where user_id=$1",
              [uid],
            )
          ).rows,
        ).toHaveLength(0);
        await db.query("select public.sync_discord_profile()");
        expect(
          (
            await db.query<{ version: number }>(
              "select version from public.user_permissions where user_id=$1",
              [uid],
            )
          ).rows[0].version,
        ).toBe(rows[0].version);
      });
      const logs = (
        await db.query<{ new_data: { access_role: string } }>(
          "select * from public.audit_logs where entity='user_permissions' and new_data->>'user_id'=$1 order by created_at",
          [uid],
        )
      ).rows;
      expect(logs.at(-1)?.new_data.access_role).toBe("admin");
    },
  );
  it("does not grant rights from editable metadata containing an allowed ID", async () => {
    await db.query(
      `update auth.users set raw_user_meta_data='{"discord_id":"470653391094415362","provider_id":"470653391094415362","role":"admin"}' where id=$1`,
      [OUTSIDER],
    );
    await asUser(db, OUTSIDER, async () => {
      await db.query("select public.sync_discord_profile()");
      expect(
        (await db.query("select * from public.user_permissions")).rows,
      ).toHaveLength(0);
    });
  });
  it("does not trust a matching provider ID from a different provider", async () => {
    await db.query(
      "insert into auth.identities(user_id,provider,provider_id) values($1,'github','470653391094415362')",
      [OUTSIDER],
    );
    await asUser(db, OUTSIDER, async () => {
      await db.query("select public.sync_discord_profile()");
      expect(
        (await db.query("select * from public.user_permissions")).rows,
      ).toHaveLength(0);
    });
  });
  it("keeps the administrator allowlist inaccessible even to application administrators", async () => {
    await asUser(db, ADMIN, async () => {
      await expect(
        db.query("select * from public.discord_admin_allowlist"),
      ).rejects.toHaveProperty("code", "42501");
      await expect(
        db.query(
          "insert into public.discord_admin_allowlist values('999999999999999999')",
        ),
      ).rejects.toHaveProperty("code", "42501");
      const result = await db.query<{ allowed: boolean }>(
        "select has_function_privilege(current_user,'public.grant_verified_discord_admin()','EXECUTE') allowed",
      );
      expect(result.rows[0].allowed).toBe(false);
    });
  });
  it("applies the migration to an existing verified account before its next login", async () => {
    const existing = await database();
    try {
      // Reconstruct a deployed database immediately before migration 006.
      await existing.db.exec(
        "drop trigger verified_discord_admin on public.profiles; drop function public.grant_verified_discord_admin(); drop table public.discord_admin_allowlist;",
      );
      await existing.db.query(
        "insert into auth.identities(user_id,provider,provider_id,identity_data) values($1,'discord','622043290321289216','{\"full_name\":\"Bestehender Discord Admin\"}')",
        [OUTSIDER],
      );
      await existing.db.exec(
        await readFile(
          new URL(
            "../supabase/migrations/202610190006_discord_admins.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const rows = (
        await existing.db.query<{ access_role: string }>(
          "select access_role from public.user_permissions where user_id=$1 and team_id=$2",
          [OUTSIDER, existing.team],
        )
      ).rows;
      expect(rows).toEqual([{ access_role: "admin" }]);
    } finally {
      await existing.db.close();
    }
  });
});
