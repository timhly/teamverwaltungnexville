import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN, EDITOR, VIEWER, OUTSIDER, asUser, database } from "./db-helper";
import { randomUUID } from "node:crypto";

describe("PostgreSQL: migrations, permissions and transactional mutations", () => {
  let db: PGlite, team: string;
  beforeAll(async () => {
    ({ db, team } = await database());
  });
  afterAll(async () => {
    await db?.close();
  });
  const rows = async (sql: string, args: unknown[] = []) =>
    (await db.query<Record<string, any>>(sql, args)).rows;
  const mutate = async (
    table: string,
    id: string,
    expected: number,
    patch: Record<string, unknown>,
    operation = randomUUID(),
    remove = false,
  ) => {
    const result = await rows(
      "select public.mutate($1::uuid,$2,$3::uuid,$4::int,$5::jsonb,$6::uuid,$7::boolean) result",
      [team, table, id, expected, JSON.stringify(patch), operation, remove],
    );
    return result[0].result;
  };
  it("seeds nine reference members and twenty-one roles without guessed assignments", async () => {
    expect(
      (await rows("select count(*)::int n from public.team_members"))[0].n,
    ).toBe(9);
    expect((await rows("select count(*)::int n from public.roles"))[0].n).toBe(
      21,
    );
    expect(
      (
        await rows(
          "select count(*)::int n from public.member_roles mr join public.roles r on r.id=mr.role_id where r.code='A'",
        )
      )[0].n,
    ).toBe(0);
    expect(
      (await rows("select reference_count from public.roles where code='A'"))[0]
        .reference_count,
    ).toBe(2);
  });
  it("seed is not reapplied over existing data", async () => {
    await db.query("select public.seed_team($1::uuid)", [team]);
    expect(
      (await rows("select count(*)::int n from public.team_members"))[0].n,
    ).toBe(9);
  });
  it("assigns the correct rank categories and preserves the renamed Birne assignment", async () => {
    expect(
      (
        await rows(
          "select name from public.roles where kind='rank' order by sort_order",
        )
      ).map((r) => r.name),
    ).toEqual([
      "Projektleitung",
      "Management",
      "Administration",
      "Senior Moderator",
      "Moderator",
      "Senior Supporter",
      "Supporter",
      "Test Supporter",
    ]);
    expect(
      (
        await rows(
          "select name from public.roles where kind='extra' order by sort_order",
        )
      ).map((r) => r.name),
    ).toEqual([
      "Fraktionsverwaltung",
      "Unternehmensverwaltung",
      "Eventverwaltung",
      "Supportleitung",
      "Teamleitung",
    ]);
    expect(
      (
        await rows(
          "select r.name from public.roles r join public.member_roles mr on mr.role_id=r.id join public.team_members m on mr.member_id=m.id where m.name='Birne'",
        )
      ).map((r) => r.name),
    ).toContain("Senior Moderator");
  });
  it("denies anonymous reads and RPC writes", async () => {
    await asUser(
      db,
      "",
      async () => {
        await expect(
          rows("select * from public.team_members"),
        ).rejects.toHaveProperty("code", "42501");
        await expect(
          mutate("team_members", randomUUID(), 0, { name: "Anonymous" }),
        ).rejects.toHaveProperty("code", "42501");
      },
      "anon",
    );
  });
  it("hides every team row from an authenticated outsider", async () => {
    await asUser(db, OUTSIDER, async () => {
      expect(await rows("select * from public.team_members")).toHaveLength(0);
      expect(await rows("select * from public.audit_logs")).toHaveLength(0);
      await expect(
        mutate("team_members", randomUUID(), 0, { name: "Intruder" }),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("reader can read but cannot write through RPC or direct REST table grants", async () => {
    await asUser(db, VIEWER, async () => {
      expect(await rows("select * from public.team_members")).toHaveLength(9);
      await expect(
        mutate("team_members", randomUUID(), 0, { name: "Reader write" }),
      ).rejects.toHaveProperty("code", "42501");
      await expect(
        rows(
          "insert into public.team_members(team_id,name) values($1,'bypass')",
          [team],
        ),
      ).rejects.toHaveProperty("code", "42501");
      await expect(
        rows(
          "update public.user_permissions set access_role='admin' where user_id=$1",
          [VIEWER],
        ),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("editor can edit members but cannot create roles or escalate permissions", async () => {
    await asUser(db, EDITOR, async () => {
      const member = await mutate("team_members", randomUUID(), 0, {
        name: "Editor member",
      });
      expect(member.version).toBe(1);
      await expect(
        mutate("roles", randomUUID(), 0, { name: "Escalated", code: "ESC" }),
      ).rejects.toHaveProperty("code", "42501");
      const p = (
        await rows("select * from public.user_permissions where user_id=$1", [
          EDITOR,
        ])
      )[0];
      await expect(
        mutate("user_permissions", p.id, p.version, { access_role: "admin" }),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("server respects individual editor module permissions", async () => {
    const p = (
      await rows("select * from public.user_permissions where user_id=$1", [
        EDITOR,
      ])
    )[0];
    await asUser(db, ADMIN, () =>
      mutate("user_permissions", p.id, p.version, { modules: ["members"] }),
    );
    await asUser(db, EDITOR, async () => {
      await expect(
        mutate("team_wishes", randomUUID(), 0, { title: "Denied" }),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("assigns multiple roles atomically and advances member revision", async () => {
    const roles = await rows(
      "select id from public.roles where code in ('S','UV')",
    );
    await asUser(db, ADMIN, async () => {
      const member = await mutate("team_members", randomUUID(), 0, {
        name: "Multi role",
        role_ids: roles.map((r) => r.id),
      });
      expect(
        await rows("select * from public.member_roles where member_id=$1", [
          member.id,
        ]),
      ).toHaveLength(2);
      const updated = await mutate("team_members", member.id, 1, {
        role_ids: [roles[0].id],
      });
      expect(updated.version).toBe(2);
      expect(
        await rows("select * from public.member_roles where member_id=$1", [
          member.id,
        ]),
      ).toHaveLength(1);
    });
  });
  it("rolls the entire member creation back when a role foreign key fails", async () => {
    const id = randomUUID();
    await asUser(db, ADMIN, async () => {
      await expect(
        mutate("team_members", id, 0, {
          name: "Rollback test",
          role_ids: [randomUUID()],
        }),
      ).rejects.toHaveProperty("code", "23503");
      expect(
        await rows("select * from public.team_members where id=$1", [id]),
      ).toHaveLength(0);
      expect(
        await rows("select * from public.audit_logs where entity_id=$1", [id]),
      ).toHaveLength(0);
    });
  });
  it("replays a network retry once without duplicate rows or audit entries", async () => {
    const id = randomUUID(),
      op = randomUUID();
    await asUser(db, ADMIN, async () => {
      const a = await mutate(
        "team_wishes",
        id,
        0,
        { title: "Idempotent wish" },
        op,
      );
      const b = await mutate(
        "team_wishes",
        id,
        0,
        { title: "Idempotent wish" },
        op,
      );
      expect(a).toEqual(b);
      expect(
        await rows("select * from public.audit_logs where entity_id=$1", [id]),
      ).toHaveLength(1);
      await expect(
        mutate("team_wishes", id, 0, { title: "Different request" }, op),
      ).rejects.toHaveProperty("code", "22023");
    });
  });
  it("rejects a stale revision instead of overwriting another editor", async () => {
    await asUser(db, ADMIN, async () => {
      const id = randomUUID();
      await mutate("team_wishes", id, 0, { title: "Original" });
      await mutate("team_wishes", id, 1, { title: "First editor" });
      await expect(
        mutate("team_wishes", id, 1, { title: "Stale editor" }),
      ).rejects.toHaveProperty("code", "40001");
      expect(
        (
          await rows("select title from public.team_wishes where id=$1", [id])
        )[0].title,
      ).toBe("First editor");
    });
  });
  it("rejects immutable field injection, null versions, and invalid warning ranges", async () => {
    await asUser(db, ADMIN, async () => {
      await expect(
        mutate("team_members", randomUUID(), 0, {
          name: "Injection",
          version: 999,
        }),
      ).rejects.toHaveProperty("code", "22023");
      await expect(
        mutate("team_members", randomUUID(), null as unknown as number, {
          name: "Null expected",
        }),
      ).rejects.toHaveProperty("code", "22023");
      const member = (
        await rows("select id from public.team_members limit 1")
      )[0];
      await expect(
        mutate("warnings", randomUUID(), 0, {
          member_id: member.id,
          level: 2,
          reason: "Date validation",
          starts_on: "2026-11-02",
          expires_on: "2026-11-01",
        }),
      ).rejects.toHaveProperty("code", "23514");
    });
  });
  it("creates independent thirteen-line agendas and unique attendance snapshots", async () => {
    await asUser(db, ADMIN, async () => {
      const m1 = await mutate("meetings", randomUUID(), 0, {
        title: "Session A",
        starts_at: "2026-11-03T19:00:00Z",
      });
      const m2 = await mutate("meetings", randomUUID(), 0, {
        title: "Session B",
        starts_at: "2026-11-10T19:00:00Z",
      });
      expect(
        await rows("select * from public.meeting_topics where meeting_id=$1", [
          m1.id,
        ]),
      ).toHaveLength(13);
      const a = (
        await rows(
          "select * from public.meeting_attendance where meeting_id=$1 limit 1",
          [m1.id],
        )
      )[0];
      await mutate("meeting_attendance", a.id, a.version, {
        status: "present",
      });
      expect(
        (
          await rows(
            "select * from public.meeting_attendance where meeting_id=$1 and member_id=$2",
            [m2.id, a.member_id],
          )
        )[0].status,
      ).toBe("open");
      const member = (
        await rows("select * from public.team_members where id=$1", [
          a.member_id,
        ])
      )[0];
      await mutate("team_members", member.id, member.version, {
        name: "Renamed historical member",
        status: "archived",
      });
      const original = (
        await rows("select * from public.meeting_attendance where id=$1", [
          a.id,
        ])
      )[0];
      expect(original.name_snapshot).toBe(a.name_snapshot);
      expect(original.status).toBe("present");
      expect(original.roles_snapshot).toEqual(a.roles_snapshot);
    });
  });
  it("copies topics while resetting done state and taking new attendance snapshots", async () => {
    await asUser(db, ADMIN, async () => {
      const source = (
        await rows("select * from public.meetings where title='Session A'")
      )[0];
      const topic = (
        await rows(
          "select * from public.meeting_topics where meeting_id=$1 order by position limit 1",
          [source.id],
        )
      )[0];
      await mutate("meeting_topics", topic.id, topic.version, {
        title: "Copied agenda",
        done: true,
      });
      const copy = await mutate("meetings", randomUUID(), 0, {
        title: "Copy",
        starts_at: "2026-12-01T19:00:00Z",
        copy_source: source.id,
      });
      const copied = await rows(
        "select * from public.meeting_topics where meeting_id=$1 order by position",
        [copy.id],
      );
      expect(copied).toHaveLength(13);
      expect(copied[0].title).toBe("Copied agenda");
      expect(copied[0].done).toBe(false);
      expect(
        (
          await rows(
            "select count(*)::int n from public.meeting_attendance where meeting_id=$1 and status<>'open'",
            [copy.id],
          )
        )[0].n,
      ).toBe(0);
    });
  });
  it("calculates warning expiry on the server without deleting history", async () => {
    const member = (
      await rows("select id from public.team_members limit 1")
    )[0];
    await asUser(db, ADMIN, async () => {
      const old = await mutate("warnings", randomUUID(), 0, {
        member_id: member.id,
        level: 1,
        reason: "Expired",
        starts_on: "2020-01-01",
        expires_on: "2020-01-02",
      });
      const live = await mutate("warnings", randomUUID(), 0, {
        member_id: member.id,
        level: 2,
        reason: "Active",
        starts_on: "2020-01-01",
        expires_on: null,
      });
      expect(
        (
          await rows("select active from public.warning_status where id=$1", [
            old.id,
          ])
        )[0].active,
      ).toBe(false);
      expect(
        (
          await rows("select active from public.warning_status where id=$1", [
            live.id,
          ])
        )[0].active,
      ).toBe(true);
      await mutate("warnings", live.id, 1, { revoked: true });
      expect(
        (
          await rows("select active from public.warning_status where id=$1", [
            live.id,
          ])
        )[0].active,
      ).toBe(false);
      expect(
        await rows("select * from public.warnings where id=$1", [old.id]),
      ).toHaveLength(1);
    });
  });
  it("keeps audit logs immutable and stamps the authenticated actor", async () => {
    await asUser(db, ADMIN, async () => {
      const member = await mutate("team_members", randomUUID(), 0, {
        name: "Audited",
      });
      const log = (
        await rows("select * from public.audit_logs where entity_id=$1", [
          member.id,
        ])
      )[0];
      expect(log.actor_id).toBe(ADMIN);
      expect(log.new_data.name).toBe("Audited");
      await expect(
        rows("delete from public.audit_logs"),
      ).rejects.toHaveProperty("code", "42501");
      await expect(
        rows(
          "insert into public.audit_logs(team_id,actor_name,entity,entity_id,action) values($1,'Spoof','roles',$2,'insert')",
          [team, randomUUID()],
        ),
      ).rejects.toHaveProperty("code", "42501");
    });
  });
  it("protects the last administrator and advances workspace version", async () => {
    const p = (
      await rows("select * from public.user_permissions where user_id=$1", [
        ADMIN,
      ])
    )[0];
    await asUser(db, ADMIN, async () => {
      await expect(
        mutate("user_permissions", p.id, p.version, { access_role: "viewer" }),
      ).rejects.toHaveProperty("code", "23514");
      await expect(
        mutate("user_permissions", p.id, p.version, {}, randomUUID(), true),
      ).rejects.toHaveProperty("code", "23514");
      const t = (
        await rows("select * from public.teams where id=$1", [team])
      )[0];
      const updated = await mutate("teams", team, t.version, {
        name: "Nexville Roleplay Team",
      });
      expect(updated.version).toBe(t.version + 1);
    });
  });
  it("prevents team-bound foreign keys from crossing team boundaries", async () => {
    const second = (
      await rows("select public.provision_team($1::uuid) id", [OUTSIDER])
    )[0].id;
    const foreignRole = (
      await rows("select id from public.roles where team_id=$1 limit 1", [
        second,
      ])
    )[0];
    await asUser(db, ADMIN, async () => {
      await expect(
        mutate("team_members", randomUUID(), 0, {
          name: "Cross team",
          role_ids: [foreignRole.id],
        }),
      ).rejects.toHaveProperty("code", "23503");
      expect(
        await rows("select * from public.team_members where team_id=$1", [
          second,
        ]),
      ).toHaveLength(0);
    });
  });
});
