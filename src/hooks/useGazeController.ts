"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type MoonGazeState = "orbiting" | "grabbed" | "returning";

export interface GazeController {
  /** 0 = 月球，1 = 眼球。每幀由 update 推進 */
  morph: { current: number };
  /** 視線方向，view-space NDC（x, y 各自 [-1, 1]，攝影機正前方為 0,0）*/
  gazeDir: THREE.Vector2;
  /** 月球狀態切換入口 */
  setMoonState: (state: MoonGazeState) => void;
  /** useFrame 內呼叫：推進時間 + 計算掃視 + 平滑過渡 */
  update: (dt: number, pointerNDC: THREE.Vector2) => void;
}

const SACCADE_MIN_SEC = 0.8;
const SACCADE_MAX_SEC = 2.5;
const POINTER_TARGET_PROB = 0.8;
const TARGET_RADIUS = 0.85;
const SPRING_OMEGA = 7.5;

// Morph 指數收斂速度：值越大收斂越快
//   GRAB 5.5 → 約 0.4s 到 90%；RELEASE 3.5 → 約 0.65s 回到 0
const MORPH_GRAB_SPEED = 5.5;
const MORPH_RELEASE_SPEED = 3.5;

const TREMOR_FREQ = 23.0;
const TREMOR_AMP = 0.04;

function nextSaccadeDelay(): number {
  return SACCADE_MIN_SEC + Math.random() * (SACCADE_MAX_SEC - SACCADE_MIN_SEC);
}

function pickRandomTarget(out: THREE.Vector2): void {
  const a = Math.random() * Math.PI * 2;
  const r = TARGET_RADIUS * (0.4 + Math.random() * 0.6);
  out.set(Math.cos(a) * r, Math.sin(a) * r);
}

/**
 * 月球↔眼球凝視控制器（共用）
 *
 * 行為：
 *   - 每 0.8–2.5s 隨機觸發 saccade，target 80% 朝 pointer、20% 隨機
 *   - 當前 gazeDir 用 critically damped spring lerp 到 target
 *   - 額外疊高頻顫動相位（sin(time × 23) × 0.04）
 *   - morph 由 moonState 驅動：grabbed→1、其他→0，途中略微 overshoot 再回穩
 */
export function useGazeController(): GazeController {
  const stateRef = useRef<MoonGazeState>("orbiting");
  const morphCurRef = useRef(0);

  const gazeBaseRef = useRef(new THREE.Vector2(0, 0));
  const gazeBaseVelRef = useRef(new THREE.Vector2(0, 0));
  const gazeTargetRef = useRef(new THREE.Vector2(0, 0));
  const gazeOutRef = useRef(new THREE.Vector2(0, 0));

  const saccadeTimerRef = useRef(nextSaccadeDelay());
  const elapsedRef = useRef(0);

  // ScratchPad：避免每幀 alloc
  const tmpTargetRef = useRef(new THREE.Vector2());

  const controller = useMemo<GazeController>(() => ({
    morph: morphCurRef,
    gazeDir: gazeOutRef.current,
    setMoonState(state) {
      stateRef.current = state;
    },
    update(dt, pointerNDC) {
      elapsedRef.current += dt;

      // ── morph：簡單可靠的指數 lerp ──
      const targetMorph = stateRef.current === "grabbed" ? 1 : 0;
      const speed = stateRef.current === "grabbed" ? MORPH_GRAB_SPEED : MORPH_RELEASE_SPEED;
      const k = 1 - Math.exp(-dt * speed);
      morphCurRef.current = THREE.MathUtils.lerp(morphCurRef.current, targetMorph, k);

      // ── saccade timer ──
      saccadeTimerRef.current -= dt;
      if (saccadeTimerRef.current <= 0) {
        saccadeTimerRef.current = nextSaccadeDelay();
        if (Math.random() < POINTER_TARGET_PROB) {
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
      const omegaG = SPRING_OMEGA;
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

      // ── 疊上高頻顫動（只在 morph 顯著時生效）──
      const tremorScale = morphCurRef.current;
      const t = elapsedRef.current;
      const jx = Math.sin(t * TREMOR_FREQ) * TREMOR_AMP * tremorScale;
      const jy = Math.cos(t * (TREMOR_FREQ * 0.83 + 1.7)) * TREMOR_AMP * tremorScale;
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
