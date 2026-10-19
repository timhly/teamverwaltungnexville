import type { MemberRole, Role } from "./types";
import type { SelectOption } from "../components/Select";

export const WARNING_LEVELS: SelectOption[] = [
  {
    value: "0",
    label: "Keine Verwarnung",
    description: "Keine aktive Verwarnung",
    tone: "green",
  },
  {
    value: "1",
    label: "Warn 1",
    description: "Erste Verwarnungsstufe",
    tone: "yellow",
  },
  {
    value: "2",
    label: "Warn 2",
    description: "Zweite Verwarnungsstufe",
    tone: "orange",
  },
  {
    value: "3",
    label: "Warn 3",
    description: "Höchste Verwarnungsstufe",
    tone: "red",
  },
];
export function warningProtectedRole(
  memberId: string,
  roles: Role[],
  assignments: MemberRole[],
) {
  const ids = new Set(
    assignments.filter((a) => a.member_id === memberId).map((a) => a.role_id),
  );
  return roles.find(
    (r) =>
      ids.has(r.id) &&
      (r.warning_exempt ||
        ["projektleitung", "management"].includes(r.name.trim().toLowerCase())),
  );
}
