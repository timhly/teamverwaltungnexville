import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Data, Member, Warning } from "./types";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function date(value?: string | null, withTime = false) {
  if (!value) return "Nicht festgelegt";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return "Ungültiges Datum";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(parsed);
}
export function berlinDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((t) => parts.find((p) => p.type === t)?.value)
    .join("-");
}
export function warningActive(
  w: Pick<Warning, "revoked" | "starts_on" | "expires_on"> & {
    active?: boolean;
  },
  now?: Date,
) {
  if (now === undefined && typeof w.active === "boolean") return w.active;
  const today = berlinDay(now || new Date());
  return (
    !w.revoked &&
    w.starts_on <= today &&
    (!w.expires_on || w.expires_on >= today)
  );
}
export function memberRoles(data: Data, id: string) {
  const ids = new Set(
    data.member_roles.filter((r) => r.member_id === id).map((r) => r.role_id),
  );
  return data.roles.filter((r) => ids.has(r.id));
}
export function roleMembers(data: Data, id: string): Member[] {
  const ids = new Set(
    data.member_roles.filter((r) => r.role_id === id).map((r) => r.member_id),
  );
  return data.team_members.filter(
    (m) => m.status === "active" && ids.has(m.id),
  );
}
export function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}
export function relativeTime(value: string) {
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  return mins < 1
    ? "Gerade eben"
    : mins < 60
      ? `Vor ${mins} Min.`
      : mins < 1440
        ? `Vor ${Math.floor(mins / 60)} Std.`
        : date(value);
}
// datetime-local values explicitly represent Europe/Berlin, regardless of device timezone.
// Reject nonexistent and ambiguous DST wall times rather than silently shifting an appointment.
export function berlinToISO(wall: string): string {
  const numeric = Date.parse(`${wall}:00Z`);
  if (!Number.isFinite(numeric))
    throw new Error("Bitte Datum und Uhrzeit wählen.");
  const matches: number[] = [];
  for (const offset of [60, 120]) {
    const candidate = numeric - offset * 60000;
    if (isoToBerlin(new Date(candidate).toISOString()) === wall)
      matches.push(candidate);
  }
  if (matches.length !== 1)
    throw new Error(
      "Diese Uhrzeit ist wegen der Zeitumstellung ungültig oder doppeldeutig. Bitte eine andere Uhrzeit wählen.",
    );
  return new Date(matches[0]).toISOString();
}
export function isoToBerlin(iso: string) {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function downloadCSV(filename: string, rows: unknown[][]) {
  // Spreadsheet formula injection is prevented even for exported member names and notes.
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+@\-]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  const blob = new Blob(
    ["\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  downloadBlob(filename, blob);
}
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function errorMessage(error: unknown) {
  const e = error as { message?: string; code?: string };
  if (e.code === "40001" || e.message?.includes("CONFLICT"))
    return "Dieser Datensatz wurde von jemand anderem geändert. Bitte den Konflikt auflösen.";
  if (e.code === "23505")
    return "Dieser Name oder diese Abkürzung ist bereits vergeben.";
  if (e.code === "23503")
    return "Der Datensatz wird noch verwendet. Bitte zuerst die zugehörigen Zuweisungen prüfen.";
  if (e.code === "42501")
    return "Dafür fehlt die Berechtigung. Bitte die Teamverwaltung kontaktieren.";
  return e.message || "Die Anfrage konnte nicht abgeschlossen werden.";
}
