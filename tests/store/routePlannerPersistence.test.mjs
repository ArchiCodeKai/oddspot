import test from "node:test";
import assert from "node:assert/strict";
import {
  ROUTE_PLANNER_STORAGE_KEY,
  readRouteSpotsFromStorage,
  writeRouteSpotsToStorage,
} from "../../src/store/routePlannerPersistence.ts";

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("writes and reads route spots from storage", () => {
  const storage = createMemoryStorage();
  const spots = [
    {
      id: "spot-1",
      name: "怪地一號",
      category: "giant-object",
      status: "active",
      difficulty: "easy",
      lat: 25.04,
      lng: 121.5,
      coverImage: "",
    },
  ];

  writeRouteSpotsToStorage(storage, spots);

  assert.deepEqual(readRouteSpotsFromStorage(storage), spots);
});

test("returns an empty route when storage JSON is invalid", () => {
  const storage = createMemoryStorage({
    [ROUTE_PLANNER_STORAGE_KEY]: "{not-json",
  });

  assert.deepEqual(readRouteSpotsFromStorage(storage), []);
});

test("clears storage when writing an empty route", () => {
  const storage = createMemoryStorage({
    [ROUTE_PLANNER_STORAGE_KEY]: "[]",
  });

  writeRouteSpotsToStorage(storage, []);

  assert.equal(storage.getItem(ROUTE_PLANNER_STORAGE_KEY), null);
});
