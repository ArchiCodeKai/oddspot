"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type MoonGazeState = "orbiting" | "grabbed" | "returning";

export interface GazeController {
  /** 0 = 月球，1 = 眼球。每幀由 update 推進 */
  morph: { current: number };
  /** 0 = 睜眼，1 = 完全眨眼。拖曳眼球態偶發快速眨眼 */
  blink: { current: number };
  /** 視線方向，view-space NDC（x, y 各自 [-1, 1]，攝影機正前方為 0,0）*/
  gazeDir: THREE.Vector2;
  /** 月球狀態切換入口 */
  setMoonState: (state: MoonGazeState) => void;
  /** useFrame 內呼叫：推進時間 + 計算掃視 + 平滑過渡 */
  update: (dt: number, pointerNDC: THREE.Vector2) => void;
}

const SACCADE_MIN_SEC = 0.8;
const SACCADE_MAX_SEC = 2.5;
const GRABBED_SACCADE_MIN_SEC = 0.18;
const GRABBED_SACCADE_MAX_SEC = 0.78;
const IDLE_POINTER_TARGET_PROB = 0.8;
const GRABBED_POINTER_TARGET_PROB = 0.35;
const TARGET_RADIUS = 0.85;
const SPRING_OMEGA = 7.5;
const GRABBED_SPRING_OMEGA = 16.0;

// Morph 指數收斂速度：值越大收斂越快
//   GRAB 5.5 → 約 0.4s 到 90%；RELEASE 3.5 → 約 0.65s 回到 0
const MORPH_GRAB_SPEED = 5.5;
const MORPH_RELEASE_SPEED = 3.5;

const TREMOR_FREQ = 15.5;
const TREMOR_AMP = 0.026;
const GRABBED_TREMOR_AMP = 0.052;

const BLINK_MIN_SEC = 1.2;
const BLINK_MAX_SEC = 3.8;
const BLINK_DURATION_SEC = 0.16;

function nextSaccadeDelay(state: MoonGazeState): number {
  if (state === "grabbed") {
    return GRABBED_SACCADE_MIN_SEC
      + Math.random() * (GRABBED_SACCADE_MAX_SEC - GRABBED_SACCADE_MIN_SEC);
  }
  return SACCADE_MIN_SEC + Math.random() * (SACCADE_MAX_SEC - SACCADE_MIN_SEC);
}

function nextBlinkDelay(): number {
  return BLINK_MIN_SEC + Math.random() * (BLINK_MAX_SEC - BLINK_MIN_SEC);
}

function pickRandomTarget(out: THREE.Vector2): void {
  // 向下偏 bias：60% 機率落在下半圓（左下/正下/右下），上半圓 40%
  // 並且向下時的振幅範圍更大（0.55–1.0 × TARGET_RADIUS），避免「往下看」永遠是淺角度
  const lookDown = Math.random() < 0.60;
  const a = lookDown
    ? Math.PI + Math.random() * Math.PI    // 下半圓 π..2π（sin < 0）
    : Math.random() * Math.PI;              // 上半圓 0..π（sin > 0）
  const r = TARGET_RADIUS * (lookDown
    ? 0.55 + Math.random() * 0.45    // 向下：0.55–1.00（更大）
    : 0.40 + Math.random() * 0.50);  // 向上：0.40–0.90（原值）
  out.set(Math.cos(a) * r, Math.sin(a) * r);
}

/**
 * 月球↔眼球凝視控制器（共用）
 *
 * 行為：
 *   - idle 每 0.8–2.5s 隨機觸發 saccade，dragged 會加速成 0.18–0.78s
 *   - 當前 gazeDir 用 critically damped spring lerp 到 target
 *   - 額外疊高頻顫動相位（dragged 時加強）
 *   - dragged 時 1.2–3.8s 內偶發一次 160ms 快速眨眼
 *   - morph 由 moonState 驅動：grabbed→1、其他→0，途中略微 overshoot 再回穩
 */
export function useGazeController(): GazeController {
  const stateRef = useRef<MoonGazeState>("orbiting");
  const morphCurRef = useRef(0);
  const blinkCurRef = useRef(0);

  const gazeBaseRef = useRef(new THREE.Vector2(0, 0));
  const gazeBaseVelRef = useRef(new THREE.Vector2(0, 0));
  const gazeTargetRef = useRef(new THREE.Vector2(0, 0));
  const gazeOutRef = useRef(new THREE.Vector2(0, 0));

  const saccadeTimerRef = useRef(nextSaccadeDelay("orbiting"));
  const blinkTimerRef = useRef(nextBlinkDelay());
  const blinkElapsedRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  // ScratchPad：避免每幀 alloc
  const tmpTargetRef = useRef(new THREE.Vector2());

  const controller = useMemo<GazeController>(() => ({
    morph: morphCurRef,
    blink: blinkCurRef,
    gazeDir: gazeOutRef.current,
    setMoonState(state) {
      stateRef.current = state;
    },
    update(dt, pointerNDC) {
      elapsedRef.current += dt;
      const state = stateRef.current;

      // ── morph：簡單可靠的指數 lerp ──
      const targetMorph = state === "grabbed" ? 1 : 0;
      const speed = state === "grabbed" ? MORPH_GRAB_SPEED : MORPH_RELEASE_SPEED;
      const k = 1 - Math.exp(-dt * speed);
      morphCurRef.current = THREE.MathUtils.lerp(morphCurRef.current, targetMorph, k);

      // ── saccade timer ──
      saccadeTimerRef.current -= dt;
      if (saccadeTimerRef.current <= 0) {
        saccadeTimerRef.current = nextSaccadeDelay(state);
        const pointerProb = state === "grabbed"
          ? GRABBED_POINTER_TARGET_PROB
          : IDLE_POINTER_TARGET_PROB;
        if (Math.random() < pointerProb) {
          // 朝 pointer：clamp 在 TARGET_RADIUS 內
          const px = THREE.MathUtils.clamp(pointerNDC.x, -1, 1) * TARGET_RADIUS;
          const py = THREE.MathUtils.clamp(pointerNDC.y, -1, 1) * TARGET_RADIUS;
          gazeTargetRef.current.set(px, py);
        } else {
          pickRandomTarget(tmpTargetRef.current);
          gazeTargetRef.current.copy(tmpTargetRef.current);
        }
      }

      // ── gazeBase 朝 target spring ──
      const omegaG = state === "grabbed" ? GRABBED_SPRING_OMEGA : SPRING_OMEGA;
      const baseAccelX =
        (gazeTargetRef.current.x - gazeBaseRef.current.x) * omegaG * omegaG -
        2 * omegaG * gazeBaseVelRef.current.x;
      const baseAccelY =
        (gazeTargetRef.current.y - gazeBaseRef.current.y) * omegaG * omegaG -
        2 * omegaG * gazeBaseVelRef.current.y;
      gazeBaseVelRef.current.x += baseAccelX * dt;
      gazeBaseVelRef.current.y += baseAccelY * dt;
      gazeBaseRef.current.x += gazeBaseVelRef.current.x * dt;
      gazeBaseRef.current.y += gazeBaseVelRef.current.y * dt;

      // ── 快速眨眼（只在眼球態顯著時生效）──
      if (state === "grabbed" && morphCurRef.current > 0.45) {
        blinkTimerRef.current -= dt;
        if (blinkTimerRef.current <= 0 && blinkElapsedRef.current === null) {
          blinkElapsedRef.current = 0;
          blinkTimerRef.current = nextBlinkDelay();
        }
      } else {
        blinkElapsedRef.current = null;
        blinkTimerRef.current = nextBlinkDelay();
        blinkCurRef.current = THREE.MathUtils.lerp(blinkCurRef.current, 0, 1 - Math.exp(-dt * 18));
      }

      if (blinkElapsedRef.current !== null) {
        blinkElapsedRef.current += dt;
        const p = blinkElapsedRef.current / BLINK_DURATION_SEC;
        if (p >= 1) {
          blinkElapsedRef.current = null;
          blinkCurRef.current = 0;
        } else {
          blinkCurRef.current = Math.sin(p * Math.PI);
        }
      }

      // ── 疊上高頻顫動（只在 morph 顯著時生效）──
      const tremorScale = morphCurRef.current;
      const t = elapsedRef.current;
      const tremorAmp = state === "grabbed" ? GRABBED_TREMOR_AMP : TREMOR_AMP;
      const jx = Math.sin(t * TREMOR_FREQ) * tremorAmp * tremorScale;
      const jy = Math.cos(t * (TREMOR_FREQ * 0.83 + 1.7)) * tremorAmp * tremorScale;
      gazeOutRef.current.set(
        gazeBaseRef.current.x + jx,
        gazeBaseRef.current.y + jy,
      );
    },
  }), []);

  // 卸載時不需 cleanup（純 ref），保留 effect 鉤位給未來擴充
  useEffect(() => () => undefined, []);

  return controller;
}
