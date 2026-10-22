import type { Member, MemberRole, Role } from "./types";
export const RANK_NAMES = [
  "Projektleitung",
  "Management",
  "HighTeam",
  "Administration",
  "Senior Moderator",
  "Moderator",
  "Senior Supporter",
  "Supporter",
  "Test Supporter",
] as const;
export const EXTRA_NAMES = [
  "Fraktionsverwaltung",
  "Unternehmensverwaltung",
  "Eventverwaltung",
  "Supportleitung",
  "Teamleitung",
  "Head-Analyst",
] as const;
const ALIASES: Record<string, string> = {
  "High Team": "HighTeam",
  Highteam: "HighTeam",
  "Sr. Moderation": "Senior Moderator",
  Moderation: "Moderator",
  "Probe Supporter": "Test Supporter",
  "Sr. Supporter": "Senior Supporter",
};
export function rankPosition(name: string) {
  const index = RANK_NAMES.indexOf(
    (ALIASES[name] || name) as (typeof RANK_NAMES)[number],
  );
  return index < 0 ? 1000 : index;
}
export function rolePosition(role: Pick<Role, "name" | "kind" | "sort_order">) {
  const rank = rankPosition(role.name);
  if (rank < 1000) return rank;
  const extra = EXTRA_NAMES.indexOf(role.name as (typeof EXTRA_NAMES)[number]);
  if (extra >= 0) return 100 + extra;
  return (
    (role.kind === "rank" ? 20 : role.kind === "extra" ? 150 : 1000) +
    (role.sort_order || 0)
  );
}
export function sortRoles<T extends Pick<Role, "name" | "kind" | "sort_order">>(
  roles: T[],
) {
  return [...roles].sort(
    (a, b) =>
      rolePosition(a) - rolePosition(b) || a.name.localeCompare(b.name, "de"),
  );
}
export function sortMembers(
  members: Member[],
  roles: Role[],
  assignments: MemberRole[],
) {
  const positions = new Map(
    roles.map((r) => [r.id, r.kind === "rank" ? rolePosition(r) : 1000]),
  );
  const memberRanks = new Map<string, number>();
  for (const a of assignments)
    memberRanks.set(
      a.member_id,
      Math.min(
        memberRanks.get(a.member_id) ?? 1000,
        positions.get(a.role_id) ?? 1000,
      ),
    );
  return [...members].sort(
    (a, b) =>
      (memberRanks.get(a.id) ?? 1000) - (memberRanks.get(b.id) ?? 1000) ||
      a.name.localeCompare(b.name, "de"),
  );
}
export function snapshotPosition(names: string[]) {
  return Math.min(1000, ...names.map(rankPosition));
}
