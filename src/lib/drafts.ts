export interface LocalDraft {
  value: string;
  base: string;
  route: string;
  label: string;
}
export const draftPrefix = (user: string, team: string) =>
  `nexville:draft:v1:${user}:${team}:`;
export function listDrafts(
  prefix: string,
): { key: string; draft: LocalDraft }[] {
  const items: { key: string; draft: LocalDraft }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      try {
        const draft = JSON.parse(localStorage.getItem(key) || "null");
        if (draft && typeof draft.value === "string")
          items.push({ key, draft });
      } catch {
        /* Invalid browser-local draft remains untouched for recovery. */
      }
    }
  }
  return items;
}
export function readDraft(key: string): LocalDraft | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function writeDraft(key: string, draft: LocalDraft) {
  localStorage.setItem(key, JSON.stringify(draft));
  window.dispatchEvent(new Event("nexville:drafts"));
}
export function removeDraft(key: string) {
  localStorage.removeItem(key);
  window.dispatchEvent(new Event("nexville:drafts"));
}
