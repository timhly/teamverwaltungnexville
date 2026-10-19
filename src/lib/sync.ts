import { createStore, delMany, entries, setMany } from "idb-keyval";
import type { Mutation } from "./types";
export type SyncState =
  "idle" | "saving" | "saved" | "offline" | "error" | "conflict";
export interface QueueItem extends Mutation {
  queuedAt: string;
}
export interface QueueStorage {
  read(): Promise<QueueItem[] | undefined>;
  write(items: QueueItem[]): Promise<void>;
}
export function persistentStorage(scope: string): QueueStorage {
  const prefix = `v1:${scope}:`;
  const database = createStore("nexville-outbox", "operations");
  let known = new Set<string>();
  return {
    read: async () => {
      const items = (await entries<string, QueueItem>(database))
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => value)
        .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
      known = new Set(items.map((i) => i.operation));
      return items;
    },
    write: async (items) => {
      // One key per immutable operation avoids whole-queue overwrites between tabs.
      const current = new Set(items.map((i) => i.operation));
      if (items.length)
        await setMany(
          items.map((i) => [prefix + i.operation, i]),
          database,
        );
      const removed = [...known]
        .filter((id) => !current.has(id))
        .map((id) => prefix + id);
      if (removed.length) await delMany(removed, database);
      known = current;
    },
  };
}
export class SyncQueue {
  items: QueueItem[] = [];
  state: SyncState = "idle";
  error = "";
  private running = false;
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private retry = 0;
  private lastQueued = 0;
  private writes = Promise.resolve();
  constructor(
    private storage: QueueStorage,
    private send: (item: QueueItem) => Promise<void>,
    private changed: () => void,
  ) {}
  async init() {
    this.items = (await this.storage.read()) || [];
    this.lastQueued = Math.max(
      0,
      ...this.items.map((i) => Date.parse(i.queuedAt) || 0),
    );
    this.state = this.items.length ? "offline" : "idle";
    this.changed();
  }
  async enqueue(mutation: Mutation) {
    if (this.stopped) throw new Error("Die Sitzung wurde beendet.");
    this.lastQueued = Math.max(Date.now(), this.lastQueued + 1);
    const item = {
      ...mutation,
      queuedAt: new Date(this.lastQueued).toISOString(),
    };
    // Persist before displaying an optimistic draft or sending anything.
    this.items.push(item);
    try {
      await this.persist();
    } catch (e) {
      this.items = this.items.filter((x) => x.operation !== item.operation);
      this.state = "error";
      this.error =
        "Lokaler Entwurf konnte nicht gesichert werden. Bitte den Browserspeicher prüfen.";
      this.changed();
      throw e;
    }
    if (this.state !== "conflict" && this.state !== "error") {
      this.state = "saving";
      this.changed();
      void this.flush();
    } else this.changed();
  }
  private persist() {
    const snapshot = structuredClone(this.items);
    this.writes = this.writes
      .catch(() => {})
      .then(() => this.storage.write(snapshot));
    return this.writes;
  }
  async flush() {
    if (this.running || this.stopped || this.state === "conflict") return;
    this.running = true;
    clearTimeout(this.timer);
    try {
      while (this.items.length && !this.stopped) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          this.state = "offline";
          break;
        }
        this.state = "saving";
        this.error = "";
        this.changed();
        const current = this.items[0];
        try {
          await this.send(current);
          this.items = this.items.filter(
            (x) => x.operation !== current.operation,
          );
          await this.persist();
          this.retry = 0;
          this.state = this.items.length ? "saving" : "saved";
        } catch (err) {
          const e = err as { code?: string; message?: string; status?: number };
          this.error = e.message || "Verbindung fehlgeschlagen.";
          this.state = ["PT409", "40001"].includes(e.code || "")
            ? "conflict"
            : "error";
          // Retry only transient failures. Validation/authorization failures remain visible.
          const transient =
            !e.code ||
            e.code.startsWith("08") ||
            e.code === "57014" ||
            (e.status ?? 0) >= 500;
          if (this.state !== "conflict" && transient && !this.stopped) {
            this.timer = setTimeout(
              () => {
                void this.flush();
              },
              Math.min(30000, 1000 * 2 ** this.retry++),
            );
          }
          break;
        }
      }
    } finally {
      this.running = false;
      this.changed();
    }
  }
  async discardFirst() {
    if (this.running) return;
    const removed = this.items[0];
    if (!removed) return;
    // Later edits to the same entity depend on this revision; keep them out of replay.
    this.items = this.items.filter(
      (x) => !(x.table === removed.table && x.id === removed.id),
    );
    await this.persist();
    this.state = this.items.length ? "offline" : "idle";
    this.error = "";
    this.changed();
    void this.flush();
  }
  async replaceFirst(expected: number, patch: Record<string, unknown>) {
    if (this.running || !this.items[0]) return;
    const old = this.items[0];
    this.items = [
      { ...old, operation: crypto.randomUUID(), expected, patch },
      ...this.items.slice(1),
    ];
    await this.persist();
    this.state = "offline";
    this.error = "";
    this.changed();
    void this.flush();
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
}
