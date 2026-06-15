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
