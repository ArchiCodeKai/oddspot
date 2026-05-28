import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const motionSource = readFileSync("src/lib/motion/sheetMotion.ts", "utf8");
const filterSource = readFileSync("src/components/swipe/FilterSheet.tsx", "utf8");
const routeSource = readFileSync("src/components/map/RouteSheet.tsx", "utf8");
const externalNavSource = readFileSync("src/components/map/ExternalNavSheet.tsx", "utf8");
const mapPageSource = readFileSync("src/app/map/page.tsx", "utf8");

test("sheet motion rules centralize proportional enter exit and drag close thresholds", () => {
  assert.match(motionSource, /SHEET_DRAG_CLOSE_OFFSET = 80/);
  assert.match(motionSource, /SHEET_DRAG_CLOSE_VELOCITY = 650/);
  assert.match(motionSource, /SHEET_ENTER_TRANSITION/);
  assert.match(motionSource, /type: "spring"/);
  assert.match(motionSource, /stiffness: 320/);
  assert.match(motionSource, /damping: 34/);
  assert.match(motionSource, /SHEET_EXIT_TRANSITION/);
  assert.match(motionSource, /duration: 0\.2/);
  assert.match(motionSource, /REDUCED_SHEET_MOTION/);
  assert.match(motionSource, /VIEW_MODE_TRANSITION/);
});

test("filter sheet supports the same swipe down close behavior as route sheets", () => {
  assert.match(filterSource, /useDragControls/);
  assert.match(filterSource, /drag=\{shouldReduceMotion \? false : "y"\}/);
  assert.match(filterSource, /dragListener=\{false\}/);
  assert.match(filterSource, /SHEET_DRAG_CLOSE_OFFSET/);
  assert.match(filterSource, /SHEET_DRAG_CLOSE_VELOCITY/);
  assert.match(filterSource, /dragControls\.start\(event\)/);
});

test("route and external navigation sheets share motion rules and reduced motion", () => {
  for (const source of [routeSource, externalNavSource]) {
    assert.match(source, /SHEET_MOTION/);
    assert.match(source, /REDUCED_SHEET_MOTION/);
    assert.match(source, /useReducedMotion/);
  }
  assert.match(externalNavSource, /useDragControls/);
  assert.match(externalNavSource, /drag=\{shouldReduceMotion \? false : "y"\}/);
  assert.match(externalNavSource, /SHEET_DRAG_CLOSE_OFFSET/);
  assert.match(externalNavSource, /SHEET_DRAG_CLOSE_VELOCITY/);
});

test("map view mode transitions use the shared motion token", () => {
  assert.match(mapPageSource, /VIEW_MODE_TRANSITION/);
  assert.doesNotMatch(mapPageSource, /transition=\{\{ duration: 0\.22, ease: "easeInOut" \}\}/);
});
