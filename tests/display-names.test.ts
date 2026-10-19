import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN, OUTSIDER, asUser, database } from "./db-helper";

describe("Verified Discord account display names", () => {
  let db: PGlite, team: string;
  beforeAll(async () => {
    ({ db, team } = await database());
  });
  afterAll(async () => {
    await db.close();
  });
  it.each([
    ["470653391094415362", "Smok"],
    ["622043290321289216", "HAZE"],
    ["480337195878711307", "Soon"],
    ["305666557219176449", "Apx"],
    ["433674403394486275", "Ivy"],
  ])(
    "uses %s as %s for the profile and new audit events",
    async (did, name) => {
      const uid = randomUUID();
      await db.query("insert into auth.users(id,email) values($1,$2)", [
        uid,
        `${did}@example.test`,
      ]);
      await db.query(
        "insert into public.profiles(id,display_name) values($1,'Vorheriger Anzeigename')",
        [uid],
      );
      await db.query(
        `insert into auth.identities(user_id,provider,provider_id,identity_data) values($1,'discord',$2,'{"full_name":"Discord Original"}')`,
        [uid, did],
      );
      await asUser(db, uid, async () => {
        const result = (
          await db.query<{
            result: { display_name: string; discord_name: string };
          }>("select public.sync_discord_profile() result")
        ).rows[0].result;
        expect(result.display_name).toBe(name);
        expect(result.discord_name).toBe(name);
        const wid = randomUUID();
        await db.query(
          "select public.mutate($1::uuid,'team_wishes',$2::uuid,0,$3::jsonb,$4::uuid)",
          [
            team,
            wid,
            JSON.stringify({ title: "Namensprüfung", description: "Test" }),
            randomUUID(),
          ],
        );
        expect(
          (
            await db.query<{ actor_name: string }>(
              "select actor_name from public.audit_logs where entity_id=$1",
              [wid],
            )
          ).rows[0].actor_name,
        ).toBe(name);
        await db.query("select public.sync_discord_profile()");
        expect(
          (
            await db.query<{ display_name: string }>(
              "select display_name from public.profiles where id=$1",
              [uid],
            )
          ).rows[0].display_name,
        ).toBe(name);
      });
      expect(
        (
          await db.query<{ identity_data: { full_name: string } }>(
            "select identity_data from auth.identities where user_id=$1",
            [uid],
          )
        ).rows[0].identity_data.full_name,
      ).toBe("Discord Original");
    },
  );
  it("does not use an editable claimed Discord ID to assign an alias", async () => {
    await db.query(
      `update auth.users set raw_user_meta_data='{"discord_id":"470653391094415362"}' where id=$1`,
      [OUTSIDER],
    );
    await asUser(db, OUTSIDER, async () => {
      await db.query("select public.sync_discord_profile()");
      expect(
        (
          await db.query<{ display_name: string }>(
            "select display_name from public.profiles where id=$1",
            [OUTSIDER],
          )
        ).rows[0].display_name,
      ).toBe("Extern");
    });
  });
  it("does not expose the alias configuration to application accounts", async () => {
    await asUser(db, ADMIN, async () => {
      await expect(
        db.query("select * from public.discord_display_names"),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("relabels existing audit authors while preserving the actual change records", async () => {
    const existing = await database();
    try {
      await existing.db.exec(
        "drop trigger discord_display_name on public.profiles; drop function public.apply_discord_display_name(); drop table public.discord_display_names;",
      );
      await existing.db.query(
        `insert into auth.identities(user_id,provider,provider_id,identity_data) values($1,'discord','470653391094415362','{"full_name":"Discord Original"}')`,
        [OUTSIDER],
      );
      const wid = randomUUID();
      await asUser(existing.db, OUTSIDER, async () => {
        await existing.db.query("select public.sync_discord_profile()");
        await existing.db.query(
          "select public.mutate($1::uuid,'team_wishes',$2::uuid,0,$3::jsonb,$4::uuid)",
          [
            existing.team,
            wid,
            JSON.stringify({
              title: "Vor der Umbenennung",
              description: "Original",
            }),
            randomUUID(),
          ],
        );
      });
      const before = (
        await existing.db.query<{ new_data: unknown; actor_name: string }>(
          "select new_data,actor_name from public.audit_logs where entity_id=$1",
          [wid],
        )
      ).rows[0];
      expect(before.actor_name).not.toBe("Smok");
      await existing.db.exec(
        await readFile(
          new URL(
            "../supabase/migrations/202610190008_display_names.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const after = (
        await existing.db.query<{ new_data: unknown; actor_name: string }>(
          "select new_data,actor_name from public.audit_logs where entity_id=$1",
          [wid],
        )
      ).rows[0];
      expect(after.actor_name).toBe("Smok");
      expect(after.new_data).toEqual(before.new_data);
    } finally {
      await existing.db.close();
    }
  });
});
