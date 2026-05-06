"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type MoonGazeState = "orbiting" | "grabbed" | "returning";

export interface GazeController {
  /** 0 = 月球，1 = 眼球。每幀由 update 推進 */
  morph: { current: number };
  /** 0 = 睜眼，1 = 完全眨眼。拖曳眼球態偶發快速眨眼 */
  blink: { current: number };
  /** 0 = saccade 移動中，1 = 注視點停留後的高頻微震可見 */
  tremor: { current: number };
  /** 視線方向，view-space NDC（x, y 各自 [-1, 1]，攝影機正前方為 0,0）*/
  gazeDir: THREE.Vector2;
  /** 月球狀態切換入口 */
  setMoonState: (state: MoonGazeState) => void;
  /** useFrame 內呼叫：推進時間 + 計算掃視 + 平滑過渡 */
  update: (dt: number, pointerNDC: THREE.Vector2) => void;
}

const SACCADE_MIN_SEC = 0.8;
const SACCADE_MAX_SEC = 2.5;
const IDLE_POINTER_TARGET_PROB = 0.8;
const GRABBED_POINTER_TARGET_PROB = 0.35;
const TARGET_RADIUS = 1.0;
const SPRING_OMEGA = 7.5;
const GRABBED_SPRING_OMEGA = 16.0;

// Morph 指數收斂速度：值越大收斂越快
//   GRAB 5.5 → 約 0.4s 到 90%；RELEASE 3.5 → 約 0.65s 回到 0
const MORPH_GRAB_SPEED = 5.5;
const MORPH_RELEASE_SPEED = 3.5;

const TREMOR_FREQ_A = 42.0;
const TREMOR_FREQ_B = 31.0;
const TREMOR_AMP = 0.005;
const GRABBED_TREMOR_AMP = 0.0105;
const TREMOR_SETTLE_SEC = 0.2;

const BLINK_MIN_SEC = 1.2;
const BLINK_MAX_SEC = 3.8;
const BLINK_DURATION_SEC = 0.16;

function constrainGazeTarget(out: THREE.Vector2): void {
  const xAbs = Math.abs(out.x);
  // 上方視線只允許「水平偏左/偏右時稍微往上」；正上方會像翻白眼。
  // 下半部不限制，保留使用者覺得好的驚悚低視線運動。
  if (out.y > 0) {
    const upperCap = 0.06 + xAbs * 0.34;
    out.y = Math.min(out.y, upperCap);
  }
}

function nextSaccadeDelay(state: MoonGazeState): number {
  if (state === "grabbed") {
    // 雙峰分布：50% 快速切換（0.4–1.4s）；50% 長停留（1.4–4.0s）
    // → 有時候馬上切換、有時候盯著一個方向看久一點，不再永遠快速跳
    return Math.random() < 0.5
      ? 0.4 + Math.random() * 1.0
      : 1.4 + Math.random() * 2.6;
  }
  return SACCADE_MIN_SEC + Math.random() * (SACCADE_MAX_SEC - SACCADE_MIN_SEC);
}

function nextBlinkDelay(): number {
  return BLINK_MIN_SEC + Math.random() * (BLINK_MAX_SEC - BLINK_MIN_SEC);
}

function pickRandomTarget(out: THREE.Vector2): void {
  // 向下偏 bias：60% 機率落在下半圓
  const lookDown = Math.random() < 0.60;
  const upperSide = Math.random() < 0.5;
  const a = lookDown
    ? Math.PI + Math.random() * Math.PI
    : upperSide
      ? Math.random() * Math.PI * 0.34
      : Math.PI * 0.66 + Math.random() * Math.PI * 0.34;
  // Magnitude 用 power distribution（u^2.0）→ 大多數 sample 集中在 0–0.4（接近正面）
  // 偶發 sample 衝到 0.8–1.0（極端角度）→ 不再幾乎都看極端
  // lookDown 用稍小的 power（1.6）讓「往下看」偶爾更誇張
  const u = Math.random();
  const power = lookDown ? 1.6 : 2.0;
  const r = TARGET_RADIUS * (0.05 + Math.pow(u, power) * 0.95);
  out.set(Math.cos(a) * r, Math.sin(a) * r);
  constrainGazeTarget(out);
}

/**
 * 月球↔眼球凝視控制器（共用）
 *
 * 行為：
 *   - idle 每 0.8–2.5s 隨機觸發 saccade，dragged 用快/慢雙峰停留時間
 *   - 當前 gazeDir 用 critically damped spring lerp 到 target
 *   - 到注視點穩定停留 0.2s 後才疊高頻微震，saccade 運動中不抖
 *   - dragged 時 1.2–3.8s 內偶發一次 160ms 快速眨眼
 *   - morph 由 moonState 驅動：grabbed→1、其他→0，途中略微 overshoot 再回穩
 */
export function useGazeController(): GazeController {
  const stateRef = useRef<MoonGazeState>("orbiting");
  const morphCurRef = useRef(0);
  const blinkCurRef = useRef(0);
  const tremorCurRef = useRef(0);

  const gazeBaseRef = useRef(new THREE.Vector2(0, 0));
  const gazeBaseVelRef = useRef(new THREE.Vector2(0, 0));
  const gazeTargetRef = useRef(new THREE.Vector2(0, 0));
  const gazeOutRef = useRef(new THREE.Vector2(0, 0));
  const settledTimerRef = useRef(0);

  const saccadeTimerRef = useRef(nextSaccadeDelay("orbiting"));
  const blinkTimerRef = useRef(nextBlinkDelay());
  const blinkElapsedRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  // ScratchPad：避免每幀 alloc
  const tmpTargetRef = useRef(new THREE.Vector2());

  const controller = useMemo<GazeController>(() => ({
    morph: morphCurRef,
    blink: blinkCurRef,
    tremor: tremorCurRef,
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
        settledTimerRef.current = 0;
        tremorCurRef.current = 0;
        const pointerProb = state === "grabbed"
          ? GRABBED_POINTER_TARGET_PROB
          : IDLE_POINTER_TARGET_PROB;
        if (Math.random() < pointerProb) {
          // 朝 pointer：clamp 在 TARGET_RADIUS 內
          const px = THREE.MathUtils.clamp(pointerNDC.x, -1, 1) * TARGET_RADIUS;
          const py = THREE.MathUtils.clamp(pointerNDC.y, -1, 1) * TARGET_RADIUS;
          gazeTargetRef.current.set(px, py);
          constrainGazeTarget(gazeTargetRef.current);
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

      const targetDist = gazeBaseRef.current.distanceTo(gazeTargetRef.current);
      const targetVel = gazeBaseVelRef.current.length();
      if (targetDist < 0.018 && targetVel < 0.14) {
        settledTimerRef.current += dt;
      } else {
        settledTimerRef.current = 0;
      }
      const tremorTarget = settledTimerRef.current >= TREMOR_SETTLE_SEC ? 1 : 0;
      const tremorSpeed = tremorTarget > 0 ? 18 : 32;
      tremorCurRef.current = THREE.MathUtils.lerp(
        tremorCurRef.current,
        tremorTarget,
        1 - Math.exp(-dt * tremorSpeed),
      );

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

      // ── 疊上高頻注視微震：saccade 運動中不抖，到點停留 0.2s 後才抖 ──
      const tremorScale = morphCurRef.current * tremorCurRef.current;
      const t = elapsedRef.current;
      const tremorAmp = state === "grabbed" ? GRABBED_TREMOR_AMP : TREMOR_AMP;
      const jx = (Math.sin(t * TREMOR_FREQ_A) + Math.sin(t * TREMOR_FREQ_B + 1.7) * 0.45) * tremorAmp * tremorScale;
      const jy = (Math.cos(t * (TREMOR_FREQ_A * 0.91 + 0.8)) + Math.sin(t * (TREMOR_FREQ_B * 1.13 + 2.4)) * 0.42) * tremorAmp * tremorScale;
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
