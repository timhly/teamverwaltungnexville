import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ADMIN, EDITOR, VIEWER, OUTSIDER, asUser, database } from "./db-helper";

let context: Awaited<ReturnType<typeof database>>;
beforeAll(async () => { context = await database(); });
afterAll(async () => { await context?.db.close(); });
async function mutate(table: string, id: string, version: number, patch = {}, remove = false, operation = randomUUID()) {
  const result = await context.db.query<{ result: any }>(
    "select public.mutate($1,$2,$3,$4,$5,$6,$7) result",
    [context.team, table, id, version, JSON.stringify(patch), operation, remove],
  );
  return result.rows[0].result;
}
async function count(table: string, column: string, id: string) {
  return (await context.db.query<{ n: number }>(`select count(*)::int n from public.${table} where ${column}=$1`, [id])).rows[0].n;
}

it("only admins may permanently delete members and meetings", async () => {
  const member = await asUser(context.db, ADMIN, () => mutate("team_members", randomUUID(), 0, { name: "Delete permission test" }));
  const meeting = await asUser(context.db, ADMIN, () => mutate("meetings", randomUUID(), 0, { title: "Delete permission test", starts_at: "2026-10-22T18:00:00Z" }));
  for (const user of [EDITOR, VIEWER, OUTSIDER]) {
    await asUser(context.db, user, async () => {
      for (const [table, row] of [["team_members", member], ["meetings", meeting]] as const) {
        await expect(mutate(table, row.id, row.version, {}, true)).rejects.toHaveProperty("code", "42501");
      }
    });
  }
});

it("deletes archived members and dependent records, retains meetings, wishes and audit history", async () => {
  await asUser(context.db, ADMIN, async () => {
    const role = (await context.db.query<{ id: string }>("select id from public.roles where name='Supporter' limit 1")).rows[0];
    let member = await mutate("team_members", randomUUID(), 0, { name: "Permanent removal", role_ids: [role.id] });
    const meeting = await mutate("meetings", randomUUID(), 0, { title: "Retained meeting", starts_at: "2026-10-22T18:00:00Z", leader_id: member.id });
    const topic = (await context.db.query<{ id: string; version: number }>("select id,version from public.meeting_topics where meeting_id=$1 limit 1", [meeting.id])).rows[0];
    await mutate("meeting_topics", topic.id, topic.version, { responsible_id: member.id });
    const wish = await mutate("team_wishes", randomUUID(), 0, { title: "Retained wish", submitted_by: member.id });
    await mutate("warnings", randomUUID(), 0, { member_id: member.id, level: 1, reason: "Test", starts_on: "2026-10-22" });
    member = await mutate("team_members", member.id, member.version, { status: "archived" });
    await expect(mutate("team_members", member.id, member.version - 1, {}, true)).rejects.toHaveProperty("code", "PT409");
    expect(await count("warnings", "member_id", member.id)).toBe(1);
    const operation = randomUUID();
    const deleted = await mutate("team_members", member.id, member.version, {}, true, operation);
    expect(await mutate("team_members", member.id, member.version, {}, true, operation)).toEqual(deleted);
    for (const table of ["member_roles", "warnings", "meeting_attendance"]) expect(await count(table, "member_id", member.id)).toBe(0);
    expect(await count("team_members", "id", member.id)).toBe(0);
    expect((await context.db.query("select leader_id from public.meetings where id=$1", [meeting.id])).rows).toEqual([{ leader_id: null }]);
    expect((await context.db.query("select responsible_id from public.meeting_topics where id=$1", [topic.id])).rows).toEqual([{ responsible_id: null }]);
    expect((await context.db.query("select submitted_by from public.team_wishes where id=$1", [wish.id])).rows).toEqual([{ submitted_by: null }]);
    expect((await context.db.query("select old_data->>'name' name from public.audit_logs where entity_id=$1 and action='delete'", [member.id])).rows).toEqual([{ name: "Permanent removal" }]);
  });
});

it("deletes archived meetings with topics and attendance, preserving team members", async () => {
  await asUser(context.db, ADMIN, async () => {
    const member = await mutate("team_members", randomUUID(), 0, { name: "Retained member" });
    const meeting = await mutate("meetings", randomUUID(), 0, { title: "Removed meeting", starts_at: "2026-10-22T18:00:00Z", status: "archived" });
    expect(await count("meeting_topics", "meeting_id", meeting.id)).toBe(13);
    expect(await count("meeting_attendance", "meeting_id", meeting.id)).toBeGreaterThan(0);
    await mutate("meetings", meeting.id, meeting.version, {}, true);
    for (const table of ["meeting_topics", "meeting_attendance"]) expect(await count(table, "meeting_id", meeting.id)).toBe(0);
    expect(await count("meetings", "id", meeting.id)).toBe(0);
    expect(await count("team_members", "id", member.id)).toBe(1);
    expect(await count("audit_logs", "entity_id", meeting.id)).toBeGreaterThan(1);
  });
});
