export type AccessRole = "admin" | "editor" | "viewer";
export type Module = "members" | "roles" | "meetings" | "warnings" | "wishes";
export interface Entity {
  id: string;
  team_id: string;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface Team {
  id: string;
  name: string;
  timezone: string;
  version: number;
  created_at: string;
  updated_at: string;
}
export interface Profile {
  id: string;
  display_name: string;
  discord_id: string | null;
  discord_name: string | null;
}
export interface AccessRequest extends Entity {
  user_id: string;
  discord_id: string;
  discord_name: string;
  status: "pending" | "approved" | "rejected";
  access_role: AccessRole | null;
  decided_by: string | null;
  decided_at: string | null;
}
export interface Permission extends Entity {
  user_id: string;
  access_role: AccessRole;
  modules: Module[];
}
export interface Member extends Entity {
  name: string;
  info: string;
  notes: string;
  joined_on: string | null;
  status: "active" | "inactive" | "archived";
}
export interface Role extends Entity {
  name: string;
  code: string;
  color: string;
  description: string;
  reference_count: number | null;
  kind: "rank" | "extra" | "legacy";
  sort_order: number;
}
export interface MemberRole {
  id: string;
  team_id: string;
  member_id: string;
  role_id: string;
}
export interface Meeting extends Entity {
  title: string;
  starts_at: string;
  leader_id: string | null;
  status: "planned" | "completed" | "archived";
  notes: string;
  results: string;
  decisions: string;
}
export interface Topic extends Entity {
  meeting_id: string;
  position: number;
  title: string;
  done: boolean;
  responsible_id: string | null;
}
export type AttendanceStatus = "open" | "present" | "registered" | "absent";
export interface Attendance extends Entity {
  meeting_id: string;
  member_id: string;
  name_snapshot: string;
  roles_snapshot: string[];
  status: AttendanceStatus;
}
export interface Warning extends Entity {
  member_id: string;
  level: number;
  reason: string;
  info: string;
  starts_on: string;
  expires_on: string | null;
  revoked: boolean;
  active: boolean;
}
export type WishStatus =
  "open" | "progress" | "accepted" | "rejected" | "done" | "archived";
export interface Wish extends Entity {
  title: string;
  description: string;
  submitted_by: string | null;
  priority: "low" | "normal" | "high";
  status: WishStatus;
  internal_note: string;
}
export interface Audit {
  id: string;
  team_id: string;
  actor_id: string | null;
  actor_name: string;
  entity: string;
  entity_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}
export interface Data {
  teams: Team[];
  profiles: Profile[];
  user_permissions: Permission[];
  team_members: Member[];
  roles: Role[];
  member_roles: MemberRole[];
  meetings: Meeting[];
  meeting_topics: Topic[];
  meeting_attendance: Attendance[];
  warning_status: Warning[];
  team_wishes: Wish[];
  audit_logs: Audit[];
  access_requests: AccessRequest[];
}
export type Table =
  | "teams"
  | "team_members"
  | "roles"
  | "meetings"
  | "meeting_topics"
  | "meeting_attendance"
  | "warnings"
  | "team_wishes"
  | "user_permissions";
export interface Mutation {
  operation: string;
  table: Table;
  id: string;
  expected: number;
  patch: Record<string, unknown>;
  remove?: boolean;
}
export const EMPTY_DATA: Data = {
  teams: [],
  profiles: [],
  user_permissions: [],
  team_members: [],
  roles: [],
  member_roles: [],
  meetings: [],
  meeting_topics: [],
  meeting_attendance: [],
  warning_status: [],
  team_wishes: [],
  audit_logs: [],
  access_requests: [],
};
export const WISH_LABELS: Record<WishStatus, string> = {
  open: "Offen",
  progress: "In Bearbeitung",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
  done: "Umgesetzt",
  archived: "Archiviert",
};
export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  open: "Offen",
  present: "Anwesend",
  registered: "Angemeldet",
  absent: "Abgemeldet",
};
export const ACCESS_LABELS: Record<AccessRole, string> = {
  admin: "Administrator",
  editor: "Bearbeiter",
  viewer: "Leseberechtigt",
};
export const MODULE_LABELS: Record<Module, string> = {
  members: "Mitglieder",
  roles: "Rollen",
  meetings: "Besprechungen",
  warnings: "Verwarnungen",
  wishes: "Teamwünsche",
};
