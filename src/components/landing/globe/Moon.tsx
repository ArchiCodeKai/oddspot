"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildMoonPoints, recolorMoonPoints } from "./buildMoonPoints";
import { useAppStore } from "@/store/useAppStore";
import { useJawMoonStore } from "@/store/useJawMoonStore";

// ─── 月球參數 ─────────────────────────────────────────────────────────────────
export const MOON_RADIUS = 0.25;
export const MOON_ORBIT_RADIUS = 2.0;
const MOON_ORBIT_INCLINE_RAD = (5.14 * Math.PI) / 180;
const MOON_ORBIT_PERIOD_SEC = 32;

// 虛線軌道
const ORBIT_DASH_SIZE = 0.10;
const ORBIT_GAP_SIZE = 0.05;
const ORBIT_SEGMENTS = 144;

// 流光拖尾
const TRAIL_ARC_DEG = 130;
const TRAIL_SEGMENTS = 64;
const TRAIL_RADIUS = 2.012;

// ─── 拖曳互動型別 ──────────────────────────────────────────────────────────────
type MoonState = "orbiting" | "grabbed" | "returning";

// ─── Dust 粒子系統 ─────────────────────────────────────────────────────────────
const MAX_DUST = 64;

interface DustParticle {
  active: boolean;
  age: number;
  life: number;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
}

// ─── Module-level 暫存向量（避免每幀 GC）─────────────────────────────────────
const _moonWorldPos  = new THREE.Vector3();
const _orbitTarget   = new THREE.Vector3(MOON_ORBIT_RADIUS, 0, 0);
const _rayHit        = new THREE.Vector3();
const _raycaster     = new THREE.Raycaster();
const _camDir        = new THREE.Vector3();

// ─── Props ───────────────────────────────────────────────────────────────────
interface MoonProps {
  accentColor: THREE.Color;
  /** 0 = 隱藏，1 = 完整顯示（boot 期間 fade in） */
  visibility?: number;
}

/**
 * 月球元件 v6 — 點雲月球 + 拖曳互動
 *
 * 狀態機：
 *   orbiting  → grabbed（pointer down on moon）
 *   grabbed   → returning（pointer up）
 *   returning → orbiting（spring 回到軌道 < 0.03 距離）
 *
 * 設計重點：
 *   - moonBodyRef 是可見月球本體（grabbed 時脫軌）
 *   - orbitProxyRef 永遠在 [MOON_ORBIT_RADIUS, 0, 0] 軌道上，供 TideRippleField 使用
 *   - anchor.rotation.y 在任何狀態下都持續更新（潮汐不暫停）
 *   - 拖曳座標：raycaster + camera-facing drag plane intersection → anchor local space
 *   - grabbed 期間：tumble rotation + dust 粒子逸散 + 每 1.5s 切換主題
 */
export const Moon = forwardRef<THREE.Group, MoonProps>(function Moon(
  { accentColor, visibility = 1 },
  forwardedRef,
) {
  // ─── 群組 refs ────────────────────────────────────────────────────────────
  const anchorRef       = useRef<THREE.Group>(null);
  const moonBodyRef     = useRef<THREE.Group>(null);  // 可見月球本體
  const orbitProxyRef   = useRef<THREE.Group>(null);  // 永遠在軌道位置
  const inclineGroupRef = useRef<THREE.Group>(null);  // orbit-incline 父座標系（dust 用）
  const orbitLineRef    = useRef<THREE.LineLoop>(null);
  const trailMatRef     = useRef<THREE.LineBasicMaterial | null>(null);

  // 公開 orbitProxyRef：讓外層 TideRippleField 取得軌道真實 world position
  useImperativeHandle(forwardedRef, () => orbitProxyRef.current!, []);

  const cycleTheme      = useAppStore((s) => s.cycleTheme);
  const { camera, clock, size: viewportSize } = useThree();
  // Reused scratch vector for moon→screen projection (avoids per-frame alloc)
  const moonScreenProjRef = useRef(new THREE.Vector3());

  // ─── 月球點雲幾何（只 build 一次，主題切換改走 recolorMoonPoints） ────────
  // 改動前：grabbed 每 1.5s cycleTheme → buildMoonPoints (22k candidates) ≈ 30-60ms 卡頓
  // 改動後：useMemo 只跑一次，主題切換時下方 useEffect 重算 colors ≈ 1ms
  const moonPointsGeom = useMemo(
    () => buildMoonPoints({ moonRadius: MOON_RADIUS, accentColor }),
    // 故意不依賴 accentColor：position 是固定的，只有 colors 跟著變
    // accentColor 變動由下方 recolorMoonPoints effect 處理
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // 主題切換 → recolor 不重建
  useEffect(() => {
    recolorMoonPoints(moonPointsGeom, accentColor);
  }, [accentColor, moonPointsGeom]);

  // ─── 軌道虛線 geometry ────────────────────────────────────────────────────
  const orbitDashedGeom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(t) * MOON_ORBIT_RADIUS,
        0,
        Math.sin(t) * MOON_ORBIT_RADIUS,
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useEffect(() => { orbitLineRef.current?.computeLineDistances(); }, []);

  // ─── 流光 trail geometry ──────────────────────────────────────────────────
  const trailGeom = useMemo(() => {
    const positions = new Float32Array((TRAIL_SEGMENTS + 1) * 3);
    const colors    = new Float32Array((TRAIL_SEGMENTS + 1) * 4);
    for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
      const t = i / TRAIL_SEGMENTS;
      const a = ((1 - t) * TRAIL_ARC_DEG * Math.PI) / 180;
      positions[i * 3]     = Math.cos(a) * TRAIL_RADIUS;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(a) * TRAIL_RADIUS;
      const alpha = Math.pow(t, 1.0);
      colors[i * 4] = colors[i * 4 + 1] = colors[i * 4 + 2] = 1;
      colors[i * 4 + 3] = alpha;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color",    new THREE.BufferAttribute(colors, 4));
    return g;
  }, []);

  // 透過 primitive 建立 THREE.Line（避開 R3F <line> 與 SVG <line> 的 JSX 型別衝突）
  const trailLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    trailMatRef.current = mat;
    const line = new THREE.Line(trailGeom, mat);
    line.renderOrder = 1;
    return line;
  }, [trailGeom]);

  // 同步反應式 material 屬性（accentColor / visibility 變動時更新）
  useEffect(() => {
    const mat = trailMatRef.current;
    if (!mat) return;
    mat.color.copy(accentColor);
    mat.opacity = 0.7 * visibility;
  }, [accentColor, visibility]);

  // ─── Dust 粒子系統 ────────────────────────────────────────────────────────
  const dustParticlesRef  = useRef<DustParticle[]>(
    Array.from({ length: MAX_DUST }, () => ({
      active: false, age: 0, life: 0.6,
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    })),
  );
  const dustSpawnAccRef = useRef(0);

  // 預先建立 BufferGeometry 並取出 attribute 的直接參照（避免每幀 lookup）
  const { dustGeom, dustPosArr, dustColArr, dustPosAttr, dustColAttr } = useMemo(() => {
    const pos = new Float32Array(MAX_DUST * 3);
    const col = new Float32Array(MAX_DUST * 3);
    // 初始化：全部隱藏到視野外
    for (let i = 0; i < MAX_DUST; i++) pos[i * 3 + 1] = -9999;
    const pa = new THREE.BufferAttribute(pos, 3);
    const ca = new THREE.BufferAttribute(col, 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", pa);
    g.setAttribute("color",    ca);
    return { dustGeom: g, dustPosArr: pos, dustColArr: col, dustPosAttr: pa, dustColAttr: ca };
  }, []);

  // ─── 拖曳 state machine refs ──────────────────────────────────────────────
  const moonStateRef       = useRef<MoonState>("orbiting");
  const pointerNDCRef      = useRef(new THREE.Vector2());
  const dragPlaneRef       = useRef(new THREE.Plane());
  const angularVelRef      = useRef(new THREE.Vector3());
  const lastThemeSwitchRef = useRef(0);
  const prevPointerRef     = useRef({ x: 0, y: 0 });

  // ─── Window-level pointer events ─────────────────────────────────────────
  useEffect(() => {
    function handleMove(e: PointerEvent) {
      // 持續更新 NDC，供 useFrame 中的 raycaster 使用
      pointerNDCRef.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );
      if (moonStateRef.current !== "grabbed") return;

      // 根據 pointer 速度更新 angular velocity（平滑，避免抖動）
      const dvx = e.clientX - prevPointerRef.current.x;
      const dvy = e.clientY - prevPointerRef.current.y;
      angularVelRef.current.x = THREE.MathUtils.lerp(angularVelRef.current.x, dvy * 3.5, 0.25);
      angularVelRef.current.y = THREE.MathUtils.lerp(angularVelRef.current.y, dvx * 3.5, 0.25);
      prevPointerRef.current = { x: e.clientX, y: e.clientY };
    }

    function handleUp() {
      if (moonStateRef.current !== "grabbed") return;
      moonStateRef.current = "returning";
      document.body.style.cursor = "";
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup",   handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup",   handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  // ─── Dust 粒子生成（在 inclineGroup 座標系中）────────────────────────────
  function spawnDust() {
    const p = dustParticlesRef.current.find((dp) => !dp.active);
    if (!p || !moonBodyRef.current || !inclineGroupRef.current) return;

    // 取月球世界座標 → 轉換到 inclineGroup 本地座標（dust points 的父座標系）
    moonBodyRef.current.getWorldPosition(_moonWorldPos);
    inclineGroupRef.current.worldToLocal(_moonWorldPos);

    const speed  = 0.05 + Math.random() * 0.07;
    const theta  = Math.random() * Math.PI * 2;
    const phi    = Math.acos(2 * Math.random() - 1);
    const jitter = MOON_RADIUS * 0.4;

    p.active = true;
    p.age    = 0;
    p.life   = 0.4 + Math.random() * 0.5;
    p.x      = _moonWorldPos.x + (Math.random() - 0.5) * jitter;
    p.y      = _moonWorldPos.y + (Math.random() - 0.5) * jitter;
    p.z      = _moonWorldPos.z + (Math.random() - 0.5) * jitter;
    p.vx     = Math.sin(phi) * Math.cos(theta) * speed;
    p.vy     = Math.sin(phi) * Math.sin(theta) * speed;
    p.vz     = Math.cos(phi) * speed;
  }

  // ─── useFrame ────────────────────────────────────────────────────────────
  useFrame((_, dt) => {
    const anchor = anchorRef.current;
    const moon   = moonBodyRef.current;
    if (!anchor || !moon) return;

    // 軌道角度永遠持續（grabbed / returning 時也不停，潮汐不中斷）
    anchor.rotation.y += (dt * 2 * Math.PI) / MOON_ORBIT_PERIOD_SEC;

    const state = moonStateRef.current;
    const elapsed = clock.elapsedTime;

    // ── 位置與旋轉更新（依狀態） ────────────────────────────────────────────
    if (state === "orbiting") {
      moon.position.copy(_orbitTarget);

    } else if (state === "grabbed") {
      // Raycaster → camera-facing drag plane → anchor local 座標
      _raycaster.setFromCamera(pointerNDCRef.current, camera);
      if (_raycaster.ray.intersectPlane(dragPlaneRef.current, _rayHit)) {
        anchor.worldToLocal(_rayHit); // in-place：world → anchor local
        moon.position.copy(_rayHit);
      }

      // 主題循環（每 1.5 秒）
      if (elapsed - lastThemeSwitchRef.current >= 1.5) {
        cycleTheme();
        lastThemeSwitchRef.current = elapsed;
      }

      // Tumble rotation：阻尼 + procedural 擾動，保持有機感
      angularVelRef.current.multiplyScalar(0.93);
      moon.rotation.x += (angularVelRef.current.x + Math.sin(elapsed * 1.3) * 0.06) * dt;
      moon.rotation.y += (angularVelRef.current.y + Math.cos(elapsed * 0.9) * 0.08) * dt;
      moon.rotation.z += (angularVelRef.current.z + Math.sin(elapsed * 1.7) * 0.05) * dt;

    } else if (state === "returning") {
      // Spring 回到軌道（local space lerp；anchor 持續轉 → 世界目標每幀變動 → 產生螺旋引回效果）
      const k = 1 - Math.exp(-dt * 4.5);
      moon.position.lerp(_orbitTarget, k);

      // 漸漸歸零 rotation
      const rDamp = 1 - Math.min(dt * 4, 0.9);
      moon.rotation.x *= rDamp;
      moon.rotation.y *= rDamp;
      moon.rotation.z *= rDamp;

      if (moon.position.distanceTo(_orbitTarget) < 0.03) {
        moon.position.copy(_orbitTarget);
        moon.rotation.set(0, 0, 0);
        moonStateRef.current = "orbiting";
      }
    }

    // ── Trail opacity 淡出（grabbed 時淡出，returning/orbiting 時恢復）──────
    if (trailMatRef.current) {
      const targetOp = state === "grabbed" ? 0 : 0.7 * visibility;
      trailMatRef.current.opacity = THREE.MathUtils.lerp(
        trailMatRef.current.opacity,
        targetOp,
        Math.min(dt * 6, 1),
      );
    }

    // ── Dust 粒子：grabbed 時持續生成，其他狀態停止 ─────────────────────────
    if (state === "grabbed") {
      dustSpawnAccRef.current += dt;
      const SPAWN_INTERVAL = 1 / 28; // ~28 顆/秒，穩態約 14-18 顆同時存在
      while (dustSpawnAccRef.current >= SPAWN_INTERVAL) {
        spawnDust();
        dustSpawnAccRef.current -= SPAWN_INTERVAL;
      }
    } else {
      dustSpawnAccRef.current = 0;
    }

    // 更新每顆粒子的位置與顏色
    const aR = accentColor.r, aG = accentColor.g, aB = accentColor.b;
    for (let i = 0; i < MAX_DUST; i++) {
      const p = dustParticlesRef.current[i];
      if (!p.active) {
        dustPosArr[i * 3 + 1] = -9999; // 移出視野
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        dustPosArr[i * 3 + 1] = -9999;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      dustPosArr[i * 3]     = p.x;
      dustPosArr[i * 3 + 1] = p.y;
      dustPosArr[i * 3 + 2] = p.z;
      const fade = (1 - p.age / p.life) * visibility;
      dustColArr[i * 3]     = aR * fade;
      dustColArr[i * 3 + 1] = aG * fade;
      dustColArr[i * 3 + 2] = aB * fade;
    }
    dustPosAttr.needsUpdate = true;
    dustColAttr.needsUpdate = true;

    // ── Project moon world position to viewport pixel coords ──
    // The TeethJawR3F canvas reads this from useJawMoonStore to trigger a
    // lunge-bite when the moon enters its on-screen proximity zone.
    // Also pass the current state so the jaw can apply different bite
    // cooldowns for orbital flybys vs user-drag interaction.
    const moonProj = moonScreenProjRef.current;
    moon.getWorldPosition(moonProj);
    moonProj.project(camera); // → NDC space [-1, 1]
    const screenX = (moonProj.x * 0.5 + 0.5) * viewportSize.width;
    const screenY = (-moonProj.y * 0.5 + 0.5) * viewportSize.height;
    useJawMoonStore.getState().setMoonFrame(screenX, screenY, state);
  });

  return (
    <group ref={inclineGroupRef} rotation-x={MOON_ORBIT_INCLINE_RAD}>
      {/* 虛線軌道 */}
      <lineLoop ref={orbitLineRef} geometry={orbitDashedGeom}>
        <lineDashedMaterial
          color={accentColor}
          dashSize={ORBIT_DASH_SIZE}
          gapSize={ORBIT_GAP_SIZE}
          opacity={0.7 * visibility}
          transparent
          depthWrite={false}
        />
      </lineLoop>

      {/* 公轉錨點（rotation.y 永遠持續，grabbed 也不停） */}
      <group ref={anchorRef}>
        {/* 流光拖尾（grabbed 時淡出，由 trailMatRef 控制） */}
        <primitive object={trailLine} />

        {/* 軌道代理點：永遠在 [MOON_ORBIT_RADIUS, 0, 0]，供 TideRippleField 取軌道 world pos
            moonBodyRef 脫軌時此節點仍在正確位置，潮汐來源不受拖曳影響 */}
        <group ref={orbitProxyRef} position={[MOON_ORBIT_RADIUS, 0, 0]} />

        {/* 月球本體（grabbed 時脫軌，returning 時 spring 回到 orbitTarget） */}
        <group ref={moonBodyRef} position={[MOON_ORBIT_RADIUS, 0, 0]}>
          {/* Occluder：隱形 depth writer，讓後半軌道被正確剪掉 */}
          <mesh>
            <sphereGeometry args={[MOON_RADIUS, 16, 8]} />
            <meshBasicMaterial colorWrite={false} depthWrite />
          </mesh>

          {/* 點雲月球（坑洞 rim 密集 / 碗底稀疏） */}
          <points geometry={moonPointsGeom} frustumCulled={false}>
            <pointsMaterial
              vertexColors
              size={0.008}
              sizeAttenuation
              transparent
              opacity={visibility}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>

          {/* 互動碰撞球（略大於月球，透明，偵測 pointer down/over/out）
              stopPropagation 確保不觸發地球的拖曳事件 */}
          <mesh
            onPointerDown={(e) => {
              e.stopPropagation();
              if (moonStateRef.current === "grabbed") return;

              // 建立 camera-facing drag plane（平面通過月球當前 world 位置）
              moonBodyRef.current!.getWorldPosition(_moonWorldPos);
              camera.getWorldDirection(_camDir);
              dragPlaneRef.current.setFromNormalAndCoplanarPoint(
                _camDir,
                _moonWorldPos.clone(),
              );

              // 初始化 angular velocity（帶點初始隨機感，像「被拉離時的自旋」）
              angularVelRef.current.set(
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 1.5,
                (Math.random() - 0.5) * 0.8,
              );
              prevPointerRef.current = {
                x: e.nativeEvent.clientX,
                y: e.nativeEvent.clientY,
              };
              // 計時器重置：第一次主題切換在 1.5s 後
              lastThemeSwitchRef.current = clock.elapsedTime;

              moonStateRef.current = "grabbed";
              document.body.style.cursor = "grabbing";
            }}
            onPointerOver={() => {
              if (moonStateRef.current !== "grabbed") {
                document.body.style.cursor = "grab";
              }
            }}
            onPointerOut={() => {
              if (moonStateRef.current !== "grabbed") {
                document.body.style.cursor = "";
              }
            }}
          >
            <sphereGeometry args={[MOON_RADIUS * 1.6, 16, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>

      {/* Dust 粒子逸散（在 inclineGroup 座標系內，跟隨 dissolve 縮放/位移）
          grabbed 時從月球表面附近往外散逸，細微 energy leakage 感 */}
      <points frustumCulled={false} renderOrder={2}>
        <primitive object={dustGeom} attach="geometry" />
        <pointsMaterial
          vertexColors
          size={0.014}
          sizeAttenuation
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
});
