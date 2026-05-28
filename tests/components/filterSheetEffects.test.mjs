import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/swipe/FilterSheet.tsx", "utf8");

test("filter chips use old tube ignition and subtle idle flicker states", () => {
  assert.match(source, /@keyframes acid-chip-ignite/);
  assert.match(source, /@keyframes acid-chip-idle-flicker/);
  assert.match(source, /\.acid-filter-chip\.is-igniting/);
  assert.match(source, /\.acid-filter-chip\.is-selected/);
});
