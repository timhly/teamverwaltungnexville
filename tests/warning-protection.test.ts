import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { ADMIN, EDITOR, asUser, database } from "./db-helper";

describe("Protected ranks can never receive warnings", () => {
  let db: PGlite, team: string;
  beforeAll(async () => {
    ({ db, team } = await database());
  });
  afterAll(async () => {
    await db.close();
  });
  const rows = async (sql: string, args: unknown[] = []) =>
    (await db.query<Record<string, any>>(sql, args)).rows;
  const mutate = async (
    table: string,
    id: string,
    expected: number,
    patch: Record<string, unknown>,
  ) =>
    (
      await rows(
        "select public.mutate($1::uuid,$2,$3::uuid,$4::int,$5::jsonb,$6::uuid) result",
        [team, table, id, expected, JSON.stringify(patch), randomUUID()],
      )
    )[0].result;
  const warning = (member: string, extra = {}) =>
    mutate("warnings", randomUUID(), 0, {
      member_id: member,
      level: 1,
      reason: "Test",
      starts_on: "2026-01-01",
      ...extra,
    });
  const member = async () => {
    const id = randomUUID();
    await mutate("team_members", id, 0, { name: `Mitglied ${id}` });
    return id;
  };
  const rank = async (name: string) =>
    (
      await rows("select * from public.roles where team_id=$1 and name=$2", [
        team,
        name,
      ])
    )[0];
  it.each(["Projektleitung", "Management"])(
    "blocks every warning level for %s, including admin and editor writes",
    async (name) => {
      const role = await rank(name);
      const target = (
        await rows(
          "select member_id from public.member_roles where role_id=$1",
          [role.id],
        )
      )[0].member_id;
      for (const user of [ADMIN, EDITOR])
        await asUser(db, user, async () => {
          for (const level of [1, 2, 3])
            await expect(warning(target, { level })).rejects.toHaveProperty(
              "code",
              "23514",
            );
          await expect(
            warning(target, { revoked: true }),
          ).rejects.toHaveProperty("code", "23514");
          await expect(
            warning(target, { starts_on: "2099-01-01" }),
          ).rejects.toHaveProperty("code", "23514");
        });
    },
  );
  it("allows warnings for Administration and other non-protected ranks", async () => {
    await asUser(db, ADMIN, async () => {
      const id = await member(),
        role = await rank("Administration");
      await mutate("team_members", id, 1, { role_ids: [role.id] });
      expect((await warning(id)).revoked).toBe(false);
    });
  });
  it("revokes existing and future warnings on promotion and prevents reactivation", async () => {
    await asUser(db, ADMIN, async () => {
      const id = await member();
      const existing = await warning(id),
        future = await warning(id, { starts_on: "2099-01-01" });
      await mutate("team_members", id, 1, {
        role_ids: [(await rank("Projektleitung")).id],
      });
      const updated = (
        await rows("select * from public.warnings where id=$1", [existing.id])
      )[0];
      expect(updated.revoked).toBe(true);
      expect(
        (
          await rows("select revoked from public.warnings where id=$1", [
            future.id,
          ])
        )[0].revoked,
      ).toBe(true);
      await expect(
        mutate("warnings", existing.id, updated.version, { revoked: false }),
      ).rejects.toHaveProperty("code", "23514");
      expect(
        (
          await rows(
            "select count(*)::int n from public.audit_logs where entity='warnings' and entity_id=$1",
            [existing.id],
          )
        )[0].n,
      ).toBe(2);
    });
  });
  it("applies protection only to the two named ranks and denies changing the protection flag directly", async () => {
    await asUser(db, ADMIN, async () => {
      const role = await rank("Management");
      await expect(
        mutate("roles", role.id, role.version, { warning_exempt: false }),
      ).rejects.toHaveProperty("code", "22023");
      const renamed = await mutate("roles", role.id, role.version, {
        name: "Geschützte Leitung",
      });
      expect(renamed.warning_exempt).toBe(false);
      const target = (
        await rows(
          "select member_id from public.member_roles where role_id=$1",
          [role.id],
        )
      )[0].member_id;
      expect((await warning(target)).revoked).toBe(false);
    });
  });
  it("protects newly named Management roles and revokes their assigned members' warnings", async () => {
    await asUser(db, ADMIN, async () => {
      const id = await member(),
        rid = randomUUID();
      await mutate("roles", rid, 0, { name: "Neue Leitung", code: "NL" });
      await mutate("team_members", id, 1, { role_ids: [rid] });
      const w = await warning(id);
      await mutate("roles", rid, 1, { name: "Management" });
      expect(
        (
          await rows("select revoked from public.warnings where id=$1", [w.id])
        )[0].revoked,
      ).toBe(true);
      await expect(warning(id)).rejects.toHaveProperty("code", "23514");
    });
  });
});
