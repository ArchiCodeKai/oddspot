import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const duplicatePath = "src/lib/spots/duplicate.ts";

test("duplicate helper detects matching names after normalization", async () => {
  assert.equal(existsSync(duplicatePath), true);

  const { findDuplicateSpot } = await import("../../src/lib/spots/duplicate.ts");
  const duplicate = findDuplicateSpot(
    { name: "  超好躺俗頭  ", lat: 25.036, lng: 121.569 },
    [
      {
        id: "spot-1",
        name: "超好躺俗頭",
        lat: 25.1,
        lng: 121.6,
        status: "active",
      },
    ],
  );

  assert.equal(duplicate?.id, "spot-1");
  assert.equal(duplicate?.reason, "same-name");
});

test("duplicate helper detects nearby coordinates inside radius", async () => {
  assert.equal(existsSync(duplicatePath), true);

  const { findDuplicateSpot } = await import("../../src/lib/spots/duplicate.ts");
  const duplicate = findDuplicateSpot(
    { name: "新投稿點", lat: 25.036, lng: 121.569 },
    [
      {
        id: "spot-2",
        name: "附近舊點",
        lat: 25.03635,
        lng: 121.56925,
        status: "uncertain",
      },
    ],
  );

  assert.equal(duplicate?.id, "spot-2");
  assert.equal(duplicate?.reason, "nearby");
});

test("duplicate helper returns null for distinct names outside the radius", async () => {
  const { findDuplicateSpot } = await import("../../src/lib/spots/duplicate.ts");
  // 約 150m 外（80m 半徑之外）且名稱不同
  const result = findDuplicateSpot(
    { name: "全新的點", lat: 25.036, lng: 121.569 },
    [
      { id: "spot-3", name: "遠方舊點", lat: 25.0374, lng: 121.569, status: "active" },
    ],
  );
  assert.equal(result, null);
});

test("duplicate helper picks the nearest candidate when several are in range", async () => {
  const { findDuplicateSpot } = await import("../../src/lib/spots/duplicate.ts");
  const result = findDuplicateSpot(
    { name: "新點", lat: 25.036, lng: 121.569 },
    [
      { id: "far-but-in-range", name: "舊點A", lat: 25.0366, lng: 121.569, status: "active" },
      { id: "closest", name: "舊點B", lat: 25.03605, lng: 121.569, status: "active" },
    ],
  );
  assert.equal(result?.id, "closest");
  assert.equal(result?.reason, "nearby");
});

test("duplicate helper normalizes spacing and punctuation before name compare", async () => {
  const { findDuplicateSpot, normalizeSpotName } = await import("../../src/lib/spots/duplicate.ts");
  assert.equal(normalizeSpotName("「超好躺」 消波塊_"), normalizeSpotName("超好躺消波塊"));
  const result = findDuplicateSpot(
    { name: "『雀石』", lat: 25.0, lng: 121.5 },
    [
      { id: "spot-4", name: "雀 石", lat: 24.0, lng: 120.5, status: "active" },
    ],
  );
  assert.equal(result?.id, "spot-4");
  assert.equal(result?.reason, "same-name");
});
