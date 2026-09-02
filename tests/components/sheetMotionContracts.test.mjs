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

test("reduced and full sheet variants expose the same transform keys", async () => {
  const { SHEET_MOTION, REDUCED_SHEET_MOTION } = await import(
    "../../src/lib/motion/sheetMotion.ts"
  );

  // 兩組 variants 的鍵必須對稱：shouldReduceMotion 掛載後才由 null 轉 true 時，
  // 少掉的 y 會讓 sheet 保留前一組的 y:"100%"，整個停在畫面外。
  for (const state of ["initial", "animate", "exit"]) {
    assert.equal(
      "y" in REDUCED_SHEET_MOTION[state],
      true,
      `REDUCED_SHEET_MOTION.${state} 必須明確定義 y`,
    );
    assert.equal(REDUCED_SHEET_MOTION[state].y, 0, `減少動態時 ${state} 不該有位移`);
    assert.equal("y" in SHEET_MOTION[state], true);
  }
  // 完整版才做位移
  assert.equal(SHEET_MOTION.initial.y, "100%");
  assert.equal(SHEET_MOTION.animate.y, 0);
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
