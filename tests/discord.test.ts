import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN, EDITOR, VIEWER, OUTSIDER, asUser, database } from "./db-helper";
describe("Discord identities and administrator access approval", () => {
  let db: PGlite, team: string;
  beforeAll(async () => {
    ({ db, team } = await database());
    await db.query(
      `insert into auth.identities(user_id,provider,provider_id,identity_data) values($1,'discord','123456789012345678','{"full_name":"Discord Mitglied"}')`,
      [OUTSIDER],
    );
  });
  afterAll(async () => {
    await db.close();
  });
  const rows = async (sql: string, args: unknown[] = []) =>
    (await db.query<Record<string, any>>(sql, args)).rows;
  const request = () =>
    rows("select public.request_team_access($1::uuid) result", [team]).then(
      (r) => r[0].result,
    );
  const review = (
    id: string,
    version: number,
    decision = "approved",
    role = "viewer",
  ) =>
    rows(
      "select public.review_access_request($1::uuid,$2::uuid,$3::int,$4,$5) result",
      [team, id, version, decision, role],
    ).then((r) => r[0].result);
  it("copies only the Discord identity from Auth, never editable profile metadata", async () => {
    await db.query(
      `update auth.users set raw_user_meta_data='{"provider_id":"999999999999999999","discord_id":"999999999999999999","role":"admin"}' where id=$1`,
      [OUTSIDER],
    );
    await asUser(db, OUTSIDER, async () => {
      const profile = (
        await rows("select public.sync_discord_profile() result")
      )[0].result;
      expect(profile.discord_id).toBe("123456789012345678");
      expect(profile.discord_name).toBe("Discord Mitglied");
      expect(await rows("select * from public.user_permissions")).toHaveLength(
        0,
      );
      await expect(
        rows("select * from auth.identities"),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("rejects anonymous profile sync and access requests", async () => {
    await asUser(
      db,
      "",
      async () => {
        await expect(
          rows("select public.sync_discord_profile()"),
        ).rejects.toHaveProperty("code", "42501");
        await expect(request()).rejects.toHaveProperty("code", "42501");
      },
      "anon",
    );
  });
  it("requires a verified linked Discord identity", async () => {
    await asUser(db, VIEWER, async () => {
      await expect(request()).rejects.toHaveProperty("code", "42501");
    });
  });
  it("stores a unique request without granting any permission", async () => {
    await asUser(db, OUTSIDER, async () => {
      const a = await request(),
        b = await request();
      expect(a.id).toBe(b.id);
      expect(a.version).toBe(b.version);
      expect(a.status).toBe("pending");
      expect(await rows("select * from public.team_members")).toHaveLength(0);
      expect(await rows("select * from public.user_permissions")).toHaveLength(
        0,
      );
      await expect(
        rows(`update public.access_requests set status='approved'`),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("hides pending identities from readers and editors", async () => {
    for (const uid of [VIEWER, EDITOR])
      await asUser(db, uid, async () => {
        expect(await rows("select * from public.access_requests")).toHaveLength(
          0,
        );
        expect(
          await rows("select * from public.profiles where id=$1", [OUTSIDER]),
        ).toHaveLength(0);
        const req = (await db.query("select 1")).rows;
        expect(req).toHaveLength(1);
      });
  });
  it("refuses self-approval and editor approval", async () => {
    const req = (await rows("select * from public.access_requests"))[0];
    for (const uid of [OUTSIDER, EDITOR, VIEWER])
      await asUser(db, uid, async () => {
        await expect(
          review(req.id, req.version, "approved", "admin"),
        ).rejects.toHaveProperty("code", "42501");
      });
  });
  it("rechecks the linked Discord ID at approval time", async () => {
    const req = (await rows("select * from public.access_requests"))[0];
    await db.query(
      `update auth.identities set provider_id='223456789012345678' where user_id=$1`,
      [OUTSIDER],
    );
    await asUser(db, ADMIN, async () => {
      await expect(review(req.id, req.version)).rejects.toHaveProperty(
        "code",
        "42501",
      );
    });
    await asUser(db, OUTSIDER, async () => {
      const fresh = await request();
      expect(fresh.discord_id).toBe("223456789012345678");
      expect(fresh.version).toBe(req.version + 1);
    });
  });
  it("supports rejection with no permissions and a later deliberate approval", async () => {
    let req = (await rows("select * from public.access_requests"))[0];
    await asUser(db, ADMIN, async () => {
      req = await review(req.id, req.version, "rejected");
      expect(req.status).toBe("rejected");
    });
    expect(
      await rows("select * from public.user_permissions where user_id=$1", [
        OUTSIDER,
      ]),
    ).toHaveLength(0);
    await asUser(db, OUTSIDER, async () => {
      expect((await request()).status).toBe("rejected");
    });
    await asUser(db, ADMIN, async () => {
      req = await review(req.id, req.version, "approved", "editor");
      expect(req.status).toBe("approved");
      expect(req.access_role).toBe("editor");
      expect(req.decided_by).toBe(ADMIN);
    });
    await asUser(db, OUTSIDER, async () => {
      expect(
        (
          await rows("select * from public.user_permissions where user_id=$1", [
            OUTSIDER,
          ])
        )[0].access_role,
      ).toBe("editor");
      expect(await rows("select * from public.team_members")).toHaveLength(9);
    });
  });
  it("rejects stale reviews and keeps the permission unchanged", async () => {
    const req = (await rows("select * from public.access_requests"))[0];
    await asUser(db, ADMIN, async () => {
      await expect(
        review(req.id, req.version, "approved", "admin"),
      ).rejects.toHaveProperty("code", "PT409");
    });
    expect(
      (
        await rows("select * from public.user_permissions where user_id=$1", [
          OUTSIDER,
        ])
      )[0].access_role,
    ).toBe("editor");
  });
  it("does not expose pending Discord details in public team audit events", async () => {
    const logs = await rows(
      `select * from public.audit_logs where entity='access_requests'`,
    );
    expect(logs).toHaveLength(2);
    for (const log of logs) {
      expect(log.actor_id).toBe(ADMIN);
      expect(log.new_data).not.toHaveProperty("discord_id");
      expect(log.new_data).not.toHaveProperty("discord_name");
    }
  });
});
