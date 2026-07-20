import assert from "node:assert/strict";
import test from "node:test";

// zustand persist 需要 localStorage；node 環境用最小 stub 取代
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => (memoryStorage.has(key) ? memoryStorage.get(key) : null),
  setItem: (key, value) => memoryStorage.set(key, String(value)),
  removeItem: (key) => memoryStorage.delete(key),
};

const { useSavedStore } = await import("../../src/store/useSavedStore.ts");

// 等待 pushAdd / pushRemove 的背景 fetch 完成
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

function resetStore() {
  useSavedStore.setState({ savedSpotIds: [], userId: null });
}

test("guest saves never touch the backend", async () => {
  resetStore();
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return { ok: true };
  };

  useSavedStore.getState().addSave("spot-guest");
  useSavedStore.getState().removeSave("spot-guest");
  await flushAsync();

  assert.equal(fetchCalls, 0);
});

test("addSave keeps the optimistic id when the backend accepts", async () => {
  resetStore();
  useSavedStore.setState({ userId: "user-1" });
  globalThis.fetch = async () => ({ ok: true });

  useSavedStore.getState().addSave("spot-ok");
  assert.equal(useSavedStore.getState().savedSpotIds.includes("spot-ok"), true);
  await flushAsync();
  assert.equal(useSavedStore.getState().savedSpotIds.includes("spot-ok"), true);
});

test("addSave rolls back the optimistic id when the backend fails", async () => {
  resetStore();
  useSavedStore.setState({ userId: "user-1" });
  globalThis.fetch = async () => ({ ok: false, status: 500 });

  useSavedStore.getState().addSave("spot-fail");
  // 樂觀更新先生效
  assert.equal(useSavedStore.getState().savedSpotIds.includes("spot-fail"), true);
  await flushAsync();
  // 後端失敗 → 還原
  assert.equal(useSavedStore.getState().savedSpotIds.includes("spot-fail"), false);
});

test("removeSave restores the id when the backend delete fails", async () => {
  resetStore();
  useSavedStore.setState({ userId: "user-1", savedSpotIds: ["spot-keep"] });
  globalThis.fetch = async () => ({ ok: false, status: 500 });

  useSavedStore.getState().removeSave("spot-keep");
  assert.equal(useSavedStore.getState().savedSpotIds.includes("spot-keep"), false);
  await flushAsync();
  assert.equal(useSavedStore.getState().savedSpotIds.includes("spot-keep"), true);
});

test("hydrateFromServer replaces content and dedupes ids", async () => {
  resetStore();
  useSavedStore.setState({ savedSpotIds: ["stale-1", "stale-2"] });
  useSavedStore.getState().hydrateFromServer(["a", "b", "a"]);
  assert.deepEqual(useSavedStore.getState().savedSpotIds, ["a", "b"]);

  useSavedStore.getState().clearAll();
  assert.deepEqual(useSavedStore.getState().savedSpotIds, []);
});
