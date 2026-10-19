import { describe, it, expect, vi } from "vitest";
import { SyncQueue, type QueueItem, type QueueStorage } from "../src/lib/sync";
import type { Mutation } from "../src/lib/types";
const mutation = (n = 1): Mutation => ({
  operation: `operation-${n}`,
  table: "team_members",
  id: "member",
  expected: n,
  patch: { name: `Name ${n}` },
});
const storage = () => {
  let data: QueueItem[] = [];
  return {
    read: async () => structuredClone(data),
    write: async (items: QueueItem[]) => {
      data = structuredClone(items);
    },
  } satisfies QueueStorage;
};
const settle = () => new Promise((r) => setTimeout(r, 20));
describe("persistent outbox", () => {
  it("persists before sending and only confirms after the server response", async () => {
    const order: string[] = [];
    let resolve!: () => void;
    const q = new SyncQueue(
      {
        read: async () => [],
        write: async () => {
          order.push("disk");
        },
      },
      async () => {
        order.push("send");
        await new Promise<void>((r) => {
          resolve = r;
        });
      },
      () => {},
    );
    await q.init();
    await q.enqueue(mutation());
    expect(order).toEqual(["disk", "send"]);
    expect(q.state).toBe("saving");
    expect(q.items).toHaveLength(1);
    resolve();
    await settle();
    expect(q.state).toBe("saved");
    expect(q.items).toHaveLength(0);
    q.stop();
  });
  it("retains edits across a reload and retries with the same operation id", async () => {
    const disk = storage();
    const first = new SyncQueue(
      disk,
      async () => {
        throw { code: "23514", message: "blocked" };
      },
      () => {},
    );
    await first.init();
    await first.enqueue(mutation());
    await settle();
    first.stop();
    const send = vi.fn(async () => {});
    const second = new SyncQueue(disk, send, () => {});
    await second.init();
    expect(second.items[0].operation).toBe("operation-1");
    await second.flush();
    expect(send.mock.calls[0]?.[0]).toMatchObject({ operation: "operation-1" });
    expect(second.state).toBe("saved");
    second.stop();
  });
  it("stops at a conflict and never sends the dependent edit", async () => {
    const send = vi.fn(async () => {
      throw { code: "40001", message: "CONFLICT" };
    });
    const q = new SyncQueue(storage(), send, () => {});
    await q.init();
    await q.enqueue(mutation());
    await settle();
    await q.enqueue(mutation(2));
    await settle();
    expect(q.state).toBe("conflict");
    expect(send).toHaveBeenCalledTimes(1);
    expect(q.items).toHaveLength(2);
    q.stop();
  });
  it("drops all dependent edits when explicitly choosing the server version", async () => {
    const q = new SyncQueue(
      storage(),
      async () => {
        throw { code: "40001" };
      },
      () => {},
    );
    await q.init();
    await q.enqueue(mutation());
    await settle();
    await q.enqueue(mutation(2));
    await settle();
    await q.discardFirst();
    expect(q.items).toHaveLength(0);
    q.stop();
  });
  it("does not send when local persistence fails", async () => {
    const send = vi.fn(async () => {});
    const q = new SyncQueue(
      {
        read: async () => [],
        write: async () => {
          throw new Error("quota");
        },
      },
      send,
      () => {},
    );
    await q.init();
    await expect(q.enqueue(mutation())).rejects.toThrow("quota");
    expect(send).not.toHaveBeenCalled();
    expect(q.state).toBe("error");
    q.stop();
  });
});
