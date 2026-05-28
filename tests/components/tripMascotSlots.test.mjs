import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/swipe/SwipeView.tsx", "utf8");

test("trip mascot slots keep selected spots steady and animate idle only", () => {
  assert.doesNotMatch(source, /trip-slot-glow/);
  assert.doesNotMatch(source, /trip-slot::before/);
  assert.doesNotMatch(source, /trip-slot::after/);
  assert.doesNotMatch(source, /trip-slot-scan/);
  assert.match(source, /trip-mascot-idle-hop/);
  assert.match(source, /trip-mascot-idle-look/);
  assert.match(source, /trip-mascot-squash/);
  assert.match(source, /trip-mini-pupil/);
  assert.match(source, /is-filled/);
  assert.match(source, /M55 8 C70 4,90 18,92 40/);
  assert.match(source, /M34 52 C33 44,45 36,58 36/);
  assert.doesNotMatch(source, /M10 1\.7C6\.15/);
});
