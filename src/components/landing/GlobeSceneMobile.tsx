"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLngToVec3, type GeoJSONFeatureCollection } from "./globe/geoUtils";
import { buildHeightmap } from "./globe/buildDisplacedSphere";
import { buildCoastlines } from "./globe/buildCoastlines";
import { buildTerrainSphere } from "./globe/buildTerrainSphere";
import { buildMoonTerrainSphere } from "./globe/buildMoonTerrainSphere";

// ─── 共用常數（與桌面版對齊：保證視覺敘事一致性） ────────────────
const EARTH_AXIAL_TILT_RAD = (23.5 * Math.PI) / 180;
const TAIWAN_POS = latLngToVec3(23.8, 121.0, 1.025);
const SPIN_SPEED = 0.002;
const MOON_ORBIT_RADIUS = 2.0;
const MOON_ORBIT_PERIOD_SEC = 32;
const MOON_RADIUS = 0.27;
const MOON_ORBIT_INCLINE_RAD = (5.14 * Math.PI) / 180;

// ─── Legacy D1 ripple 參數 ─────────────────────────────────────
// 手機主視覺已改成跟月球同步的橢圓潮汐殼；D1 同心圓元件保留但不掛載。
const RIPPLE_INTERVAL_SEC = 2.6;     // 強化：每 2.6 秒一波（之前 3.2）
const RIPPLE_LIFE_SEC = 3.0;         // 強化：擴散更久（之前 2.4），尾巴看得清
const RIPPLE_MAX_RADIUS_DEG = 130;   // 強化：擴更遠（之前 110）
const RIPPLE_BAND_DEG = 22;          // 強化：影響台灣脈動的頻寬更寬（之前 14）
const RIPPLE_PEAK_OPACITY = 1.0;     // 強化：最亮 1.0（之前 0.85）
const RIPPLE_LINE_RADIUS = 1.045;    // 強化：圓圈離地球更外（之前 1.030），不被地形球遮
const RIPPLE_SEGMENTS = 96;
// D3 雙球體膨脹（同時作用於 backdrop 跟 terrain sphere，視覺更明顯）
const D3_BULGE_AMOUNT = 0.045;       // 強化：膨脹兩倍（之前 0.022）
const D3_BULGE_FALLOFF_DEG = 75;     // 強化：影響範圍稍大（之前 70）

// ─── Phase 型別 ─────────────────────────────────────────────────
type Phase = "boot-0" | "boot-1" | "boot-2" | "boot-3" | "boot-4" | "idle";

// ─── 工具：讀 CSS variable 顏色 ──────────────────────────────────
function readAccentColor(): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color("#5fd9c0");
  const val = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return new THREE.Color(val || "#5fd9c0");
}

function readBgDeepColor(): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color("#040c0a");
  const val = getComputedStyle(document.documentElement).getPropertyValue("--bg-deep").trim();
  return new THREE.Color(val || "#040c0a");
}

// ─── 經緯線 wireframe（背景結構，淡淡的） ────────────────────────
// 18 經 + 12 緯，opacity 0.15，作為「球體存在感」的背景結構
// D3 潮汐會在月球方向附近讓經線頂點 outward 位移
function buildLatLngBackdrop(radius: number): {
  geom: THREE.BufferGeometry;
  /** 每個頂點的 unit vector（D3 用） */
  unitVecs: Float32Array;
  /** 每個頂點的原始 radius（D3 計算位移後的位置 = unit × (radius + bulge)） */
  baseRadii: Float32Array;
} {
  const positions: number[] = [];
  const unitVecsArr: number[] = [];
  const baseRadiiArr: number[] = [];
  const MERIDIAN_COUNT = 18;
  const PARALLEL_COUNT = 12;
  const SEGMENTS = 64;

  // 經線
  for (let m = 0; m < MERIDIAN_COUNT; m++) {
    const lng = (m / MERIDIAN_COUNT) * 360 - 180;
    for (let i = 0; i < SEGMENTS; i++) {
      const lat1 = -90 + (i / SEGMENTS) * 180;
      const lat2 = -90 + ((i + 1) / SEGMENTS) * 180;
      const p1 = latLngToVec3(lat1, lng, radius);
      const p2 = latLngToVec3(lat2, lng, radius);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      const u1 = p1.clone().normalize();
      const u2 = p2.clone().normalize();
      unitVecsArr.push(u1.x, u1.y, u1.z, u2.x, u2.y, u2.z);
      baseRadiiArr.push(radius, radius);
    }
  }
  // 緯線
  for (let p = 1; p < PARALLEL_COUNT; p++) {
    const lat = -90 + (p / PARALLEL_COUNT) * 180;
    for (let i = 0; i < SEGMENTS; i++) {
      const lng1 = -180 + (i / SEGMENTS) * 360;
      const lng2 = -180 + ((i + 1) / SEGMENTS) * 360;
      const p1 = latLngToVec3(lat, lng1, radius);
      const p2 = latLngToVec3(lat, lng2, radius);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      const u1 = p1.clone().normalize();
      const u2 = p2.clone().normalize();
      unitVecsArr.push(u1.x, u1.y, u1.z, u2.x, u2.y, u2.z);
      baseRadiiArr.push(radius, radius);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return {
    geom,
    unitVecs: new Float32Array(unitVecsArr),
    baseRadii: new Float32Array(baseRadiiArr),
  };
}

// ─── 背景星點（精簡到 100 顆） ──────────────────────────────────
function buildStarPositions(): Float32Array {
  const arr = new Float32Array(100 * 3);
  for (let i = 0; i < 100; i++) {
    const r = 8 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
}

// ─── 月球：displaced wireframe sphere（坑洞 + rim + 表面 noise） ────
// 與地球 buildTerrainSphere 同模式，效能對齊
// 加上自轉讓坑洞在公轉之外仍可見「轉動」
const MOON_SELF_ROTATION = 0.12; // rad/sec
type MoonState = "orbiting" | "grabbed" | "returning";

// Module-level scratch（避免每幀 GC）
const _moonScratchPos = new THREE.Vector3();
const _moonScratchHit = new THREE.Vector3();
const _moonRaycaster = new THREE.Raycaster();
const _moonOrbitTarget = new THREE.Vector3(MOON_ORBIT_RADIUS, 0, 0);
const _moonCamDir = new THREE.Vector3();

function MoonLite({
  accentColor,
  visibility,
  subLunarRef,
  moonStateRef,
}: {
  accentColor: THREE.Color;
  visibility: number;
  subLunarRef: React.RefObject<THREE.Vector3>;
  /** 共享狀態機：地球 onPointerDown 也讀同一份 ref，避免月球 grabbed 時雙物件搶 drag */
  moonStateRef: React.RefObject<MoonState>;
}) {
  const anchorRef = useRef<THREE.Group>(null);
  const moonBodyRef = useRef<THREE.Group>(null);
  const moonSelfRef = useRef<THREE.Group>(null);
  const matWireRef = useRef<THREE.LineBasicMaterial>(null);

  const pointerNDCRef = useRef(new THREE.Vector2());
  const dragPlaneRef = useRef(new THREE.Plane());
  const activePointerIdRef = useRef<number | null>(null);
  const captureTargetRef = useRef<Element | null>(null);

  const { camera, gl } = useThree();

  const writePointerNDC = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5;
    const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
    pointerNDCRef.current.set(x * 2 - 1, -(y * 2 - 1));
  };

  const moonTerrain = useMemo(
    () => buildMoonTerrainSphere({ moonRadius: MOON_RADIUS, segmentsW: 48, segmentsH: 24 }),
    [],
  );

  // Window pointer events（追蹤手指/滑鼠位置 → 給 raycaster 用）
  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (
        moonStateRef.current === "grabbed" &&
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      if (moonStateRef.current === "grabbed") e.preventDefault();
      writePointerNDC(e.clientX, e.clientY);
    }
    function handleUp(e: PointerEvent) {
      if (
        activePointerIdRef.current !== null &&
        e.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      if (moonStateRef.current !== "grabbed") return;
      moonStateRef.current = "returning";
      if (
        captureTargetRef.current &&
        activePointerIdRef.current !== null &&
        captureTargetRef.current.hasPointerCapture?.(activePointerIdRef.current)
      ) {
        captureTargetRef.current.releasePointerCapture(activePointerIdRef.current);
      }
      activePointerIdRef.current = null;
      captureTargetRef.current = null;
    }
    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [gl, moonStateRef]);

  useFrame((state, dt) => {
    const anchor = anchorRef.current;
    const body = moonBodyRef.current;
    const self = moonSelfRef.current;
    if (!anchor || !body) return;

    // anchor 永遠公轉（grabbed 時也不停 — 軌道穩定）
    anchor.rotation.y = state.clock.elapsedTime * (2 * Math.PI / MOON_ORBIT_PERIOD_SEC);
    if (self) self.rotation.y += dt * MOON_SELF_ROTATION;
    if (matWireRef.current) matWireRef.current.opacity = visibility * 0.07;

    const moonState = moonStateRef.current;

    if (moonState === "orbiting") {
      // 月球綁在軌道目標位置
      body.position.copy(_moonOrbitTarget);
    } else if (moonState === "grabbed") {
      // raycaster 從相機朝 NDC 方向射 ray，跟 drag plane 求交點
      _moonRaycaster.setFromCamera(pointerNDCRef.current, camera);
      if (_moonRaycaster.ray.intersectPlane(dragPlaneRef.current, _moonScratchHit)) {
        anchor.worldToLocal(_moonScratchHit);
        body.position.copy(_moonScratchHit);
      }
    } else if (moonState === "returning") {
      // Spring back 到軌道（local space lerp）
      const k = 1 - Math.exp(-dt * 4.5);
      body.position.lerp(_moonOrbitTarget, k);
      if (body.position.distanceTo(_moonOrbitTarget) < 0.03) {
        body.position.copy(_moonOrbitTarget);
        moonStateRef.current = "orbiting";
      }
    }

    // 寫 sub-lunar
    body.getWorldPosition(_moonScratchPos);
    _moonScratchPos.normalize();
    if (subLunarRef.current) subLunarRef.current.copy(_moonScratchPos);
  });

  return (
    <group ref={anchorRef} rotation-x={MOON_ORBIT_INCLINE_RAD}>
      {/* moonBodyRef 不再寫死 position — 由 useFrame 依 state 寫入 */}
      <group ref={moonBodyRef}>
        <group ref={moonSelfRef}>
          <MobileMoonShader
            geometry={moonTerrain.meshGeometry}
            accentColor={accentColor}
            visibility={visibility}
          />
          {/* 輔助線框降到極淡，主視覺交給 mesh shader 的 crater 分層。 */}
          <lineSegments geometry={moonTerrain.wireGeometry}>
            <lineBasicMaterial
              ref={matWireRef}
              color={accentColor}
              transparent
              opacity={0.07}
              depthWrite={false}
            />
          </lineSegments>
        </group>

        {/* 互動碰撞球（略大於月球，透明）→ 觸碰/手指拿取月球
            ⚠️ 不呼叫 e.stopPropagation()：R3F 的 stopPropagation 會 cancel native event
            導致 window pointermove/pointerup listener 收不到事件，月球只能跟初始 NDC 同步一次
            （= 用戶感覺「只稍微回應一下」就停）
            改用 moonStateRef 在地球 onPointerDown 內守護：grabbed 時地球不啟動拖拽 */}
        <mesh
          onPointerDown={(e) => {
            if (moonStateRef.current === "grabbed") return;
            e.nativeEvent.preventDefault();
            activePointerIdRef.current = e.nativeEvent.pointerId;
            const target = e.nativeEvent.target as Element | null;
            if (target?.setPointerCapture) {
              target.setPointerCapture(e.nativeEvent.pointerId);
              captureTargetRef.current = target;
            }

            // 建立 camera-facing drag plane（通過月球當前 world 位置）
            moonBodyRef.current!.getWorldPosition(_moonScratchPos);
            camera.getWorldDirection(_moonCamDir);
            dragPlaneRef.current.setFromNormalAndCoplanarPoint(
              _moonCamDir,
              _moonScratchPos.clone(),
            );

            // 初始化 NDC（防止第一幀沒 pointermove 時 hit 跳到 (0,0)）
            writePointerNDC(e.nativeEvent.clientX, e.nativeEvent.clientY);

            moonStateRef.current = "grabbed";
          }}
        >
          <sphereGeometry args={[MOON_RADIUS * 1.6, 16, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Legacy D1 ripple state（目前手機版不掛載）──────────────────
type RippleState = {
  age: number;
  live: boolean;
  originX: number; originY: number; originZ: number;
  nextSpawnAt: number;
};

// ─── Legacy 同心圓潮汐元件（D1，手機版目前不掛載）───────────────
// 從 sub-lunar 點觸發一個球面小圓，半徑 0 → MAX_RADIUS，時間 LIFE，淡出
// 內部用一個 256 vertex 的「unit ring」geometry，每幀只更新 position scale + opacity
function TideRipples({
  accentColor,
  subLunarRef,
  earthSpinRef,
  taiwanGeom,
  taiwanUnitVecs,
  stateRef,
}: {
  accentColor: THREE.Color;
  subLunarRef: React.RefObject<THREE.Vector3>;
  earthSpinRef: React.RefObject<THREE.Group | null>;
  /** 台灣海岸線 geometry（D2 在 wave-front 經過時提亮這個的 vertex colors） */
  taiwanGeom: THREE.BufferGeometry | null;
  /** 台灣每個頂點的 unit vector（D2 距離計算用） */
  taiwanUnitVecs: Float32Array | null;
  /** 共享的 ripple state（從 GlobeInner 傳入，給 ocean shell 也讀） */
  stateRef: React.RefObject<RippleState>;
}) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const positionsRef = useRef<Float32Array | null>(null);

  // 預建一個球面小圓的「樣板」buffer：保留每個 (segment, segment+1) 對的 angle
  // 每幀根據當前半徑 + origin 位置在 useFrame 重算 position
  const angles = useMemo(() => {
    const arr = new Float32Array((RIPPLE_SEGMENTS + 1) * 2);
    for (let i = 0; i <= RIPPLE_SEGMENTS; i++) {
      arr[i * 2]     = Math.cos((i / RIPPLE_SEGMENTS) * 2 * Math.PI);
      arr[i * 2 + 1] = Math.sin((i / RIPPLE_SEGMENTS) * 2 * Math.PI);
    }
    return arr;
  }, []);

  // ripple geometry（LineSegments，每幀重寫 position）
  const rippleGeom = useMemo(() => {
    const positions = new Float32Array(RIPPLE_SEGMENTS * 6); // segments × 2 vertices × 3 floats
    positionsRef.current = positions;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  // D2: 台灣 vertex colors 每幀更新（base color + wave-front 提亮 band）
  const taiwanColorsRef = useRef<Float32Array | null>(null);
  useEffect(() => {
    if (!taiwanGeom) return;
    const colorAttr = taiwanGeom.attributes.color;
    if (colorAttr) taiwanColorsRef.current = colorAttr.array as Float32Array;
  }, [taiwanGeom]);

  // 暫存向量（避免每幀 GC）
  const tmpOrigin    = useRef(new THREE.Vector3());
  const tmpT1        = useRef(new THREE.Vector3());
  const tmpT2        = useRef(new THREE.Vector3());
  const tmpUp        = useRef(new THREE.Vector3(0, 1, 0));
  const earthQuatInv = useRef(new THREE.Quaternion());

  useFrame((_, dt) => {
    const s = stateRef.current;
    const positions = positionsRef.current;
    if (!positions || !subLunarRef.current) return;

    s.nextSpawnAt -= dt;

    // 沒在跑就試著觸發新 ripple
    if (!s.live && s.nextSpawnAt <= 0) {
      // 把當前 sub-lunar 方向轉到地球本地座標（earth 在 spin，origin 必須 follow）
      // Origin 鎖在地球表面某個點，這樣球體自轉時 origin 跟著轉（更自然）
      const eg = earthSpinRef.current;
      const subL = subLunarRef.current;
      tmpOrigin.current.copy(subL);
      if (eg) {
        // World → earth-local：用 earth quat inverse 旋轉
        eg.getWorldQuaternion(earthQuatInv.current).invert();
        tmpOrigin.current.applyQuaternion(earthQuatInv.current).normalize();
      }
      s.originX = tmpOrigin.current.x;
      s.originY = tmpOrigin.current.y;
      s.originZ = tmpOrigin.current.z;
      s.age = 0;
      s.live = true;
      s.nextSpawnAt = RIPPLE_INTERVAL_SEC;
    }

    if (s.live) {
      s.age += dt;
      const t = s.age / RIPPLE_LIFE_SEC;
      if (t >= 1) {
        s.live = false;
        // 把 ripple 移出視野（避免閃一下）
        for (let i = 0; i < positions.length; i += 3) positions[i + 1] = -9999;
        rippleGeom.attributes.position.needsUpdate = true;
        if (matRef.current) matRef.current.opacity = 0;
      } else {
        // 半徑：ease-out（一開始快、後面慢）
        const eased = 1 - Math.pow(1 - t, 2);
        const radiusDeg = eased * RIPPLE_MAX_RADIUS_DEG;
        const fade = (1 - t) * (1 - t); // 淡出較快

        // 重算同心圓 vertex（球面小圓演算法，center = origin）
        const cx = s.originX, cy = s.originY, cz = s.originZ;
        // 切平面正交基底
        const center = tmpOrigin.current.set(cx, cy, cz).normalize();
        let t1 = tmpT1.current.crossVectors(tmpUp.current, center);
        if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
        t1.normalize();
        const t2 = tmpT2.current.crossVectors(center, t1).normalize();

        const R = (radiusDeg * Math.PI) / 180;
        const sinR = Math.sin(R);
        const cosR = Math.cos(R);
        const RR = RIPPLE_LINE_RADIUS;

        // 寫 LineSegments：每對 (i, i+1) 連成一段
        for (let i = 0; i < RIPPLE_SEGMENTS; i++) {
          const cosA1 = angles[i * 2],     sinA1 = angles[i * 2 + 1];
          const cosA2 = angles[(i + 1) * 2], sinA2 = angles[(i + 1) * 2 + 1];

          const x1 = (cx * cosR + sinR * (cosA1 * t1.x + sinA1 * t2.x)) * RR;
          const y1 = (cy * cosR + sinR * (cosA1 * t1.y + sinA1 * t2.y)) * RR;
          const z1 = (cz * cosR + sinR * (cosA1 * t1.z + sinA1 * t2.z)) * RR;

          const x2 = (cx * cosR + sinR * (cosA2 * t1.x + sinA2 * t2.x)) * RR;
          const y2 = (cy * cosR + sinR * (cosA2 * t1.y + sinA2 * t2.y)) * RR;
          const z2 = (cz * cosR + sinR * (cosA2 * t1.z + sinA2 * t2.z)) * RR;

          const idx = i * 6;
          positions[idx]     = x1;
          positions[idx + 1] = y1;
          positions[idx + 2] = z1;
          positions[idx + 3] = x2;
          positions[idx + 4] = y2;
          positions[idx + 5] = z2;
        }
        rippleGeom.attributes.position.needsUpdate = true;
        if (matRef.current) matRef.current.opacity = fade * RIPPLE_PEAK_OPACITY;

        // ─── D2 · 台灣海岸線脈動 ────────────────────────────────
        // wave-front 經過台灣時，台灣海岸線提亮
        // 算法：對台灣每個頂點，算它跟 origin 的角距離；若距離在 wave-front ± band 內 → 提亮
        const tColors = taiwanColorsRef.current;
        const tVecs = taiwanUnitVecs;
        if (tColors && tVecs && taiwanGeom) {
          const aR = accentColor.r, aG = accentColor.g, aB = accentColor.b;
          const waveFrontRad = R;  // 當前 wave-front 球面距離（弧度）
          const bandRad = (RIPPLE_BAND_DEG * Math.PI) / 180;
          const n = tVecs.length / 3;
          for (let i = 0; i < n; i++) {
            const i3 = i * 3;
            const vx = tVecs[i3], vy = tVecs[i3 + 1], vz = tVecs[i3 + 2];
            // 角距離 = acos(dot(unit, origin))
            const dot = Math.max(-1, Math.min(1, vx * cx + vy * cy + vz * cz));
            const angDist = Math.acos(dot);
            const distFromFront = Math.abs(angDist - waveFrontRad);
            // band 內 → 提亮（強化版：boost 1.6 倍，明顯易辨）
            const boost = distFromFront < bandRad ? (1 - distFromFront / bandRad) * 1.6 : 0;
            const brightness = 1.0 + boost;
            tColors[i3]     = aR * brightness;
            tColors[i3 + 1] = aG * brightness;
            tColors[i3 + 2] = aB * brightness;
          }
          taiwanGeom.attributes.color.needsUpdate = true;
        }
      }
    } else {
      // 沒 ripple 期間，台灣海岸線維持 base 顏色
      const tColors = taiwanColorsRef.current;
      const tVecs = taiwanUnitVecs;
      if (tColors && tVecs && taiwanGeom) {
        const aR = accentColor.r, aG = accentColor.g, aB = accentColor.b;
        const n = tVecs.length / 3;
        // 只有第一次呼叫時寫，避免每幀都跑同樣的迴圈
        // 偵測：第一個頂點的 R 跟 aR 差 0.001 以上才寫
        if (Math.abs(tColors[0] - aR) > 0.001) {
          for (let i = 0; i < n; i++) {
            tColors[i * 3]     = aR;
            tColors[i * 3 + 1] = aG;
            tColors[i * 3 + 2] = aB;
          }
          taiwanGeom.attributes.color.needsUpdate = true;
        }
      }
    }
  });

  return (
    <lineSegments ref={lineRef} geometry={rippleGeom} frustumCulled={false}>
      <lineBasicMaterial
        ref={matRef}
        color={accentColor}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ─── 地形 shader 元件（mesh-derived land plates）───────────────
// geometry 是完整球面；shader 用 aLandFactor 當 mask，只讓陸地填色出現。
//
// 視覺語法：
//   - aLandFactor 硬切海陸，不再用三角邊界切出鋸齒海岸
//   - aElevation 做陸地內部階梯深淺，外加等高線層讓山脈/盆地可讀
//   - sub-lunar 方向提供輕量假光照，讓 D3 隆起區能讀出高低
//
// 每幀只更新 1 個 uniform（uSubLunarLocal），mesh geometry 自身 D3 在外層處理
function MobileTerrainShader({
  geometry,
  accentColor,
  subLunarLocalRef,
}: {
  geometry: THREE.BufferGeometry;
  accentColor: THREE.Color;
  /** earth-local 月球方向（每幀 GlobeInner 更新此 ref） */
  subLunarLocalRef: React.RefObject<THREE.Vector3>;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uAccent:         { value: accentColor.clone() },
      uSubLunarLocal:  { value: new THREE.Vector3(1, 0, 0) },
    }),
    // accentColor 變化由下方 useEffect 同步 uniform，不重建 material
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uAccent.value.copy(accentColor);
  }, [accentColor, uniforms]);

  useFrame(() => {
    if (subLunarLocalRef.current) {
      uniforms.uSubLunarLocal.value.copy(subLunarLocalRef.current);
    }
  });

  return (
    <mesh geometry={geometry} renderOrder={1}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        vertexShader={/* glsl */ `
          attribute float aLandFactor;
          attribute float aElevation;
          varying float vLandFactor;
          varying float vElevation;
          varying vec3 vSphereNormal;
          void main() {
            vLandFactor = aLandFactor;
            vElevation = aElevation;
            // model space sphere normal（已 displaced 過，但 normalize 後仍指出方向）
            vSphereNormal = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uAccent;
          uniform vec3 uSubLunarLocal;
          varying float vLandFactor;
          varying float vElevation;
          varying vec3 vSphereNormal;

          void main() {
            if (vLandFactor < 0.02) discard;

            // 階梯化高程：12 階比 8 階更精細、地形分布更密
            // 配合三倍 segments 細分，陸地內部讀得出更多層次
            float stepped = floor(clamp(vElevation, 0.0, 1.0) * 12.0) / 12.0;

            // Alpha 分層加深：低地 0.55 起跳、最高 1.10（會被 clamp）
            // 比之前更深，陸地實感更強
            // 海岸邊緣拉寬淡出，避免 land fill 與 coastline/ocean mask 不完全吻合時出現硬鋸齒。
            float edge = smoothstep(0.10, 0.58, vLandFactor);
            float a = (0.48 + stepped * 0.46) * edge;

            // Lighting：朝月球面被照亮
            float dotSub = dot(vSphereNormal, uSubLunarLocal);
            float lit = max(dotSub * 0.5 + 0.5, 0.50);

            // Color：低地 0.50、高地 1.40（再加深）
            float colorMul = (0.46 + stepped * 0.78) * lit;
            vec3 col = uAccent * colorMul;

            // 高地暖白 highlight 加強：山脊白光更亮（0.22 → 0.32）
            float highMask = smoothstep(0.40, 0.85, stepped);
            col += vec3(1.0, 0.88, 0.50) * highMask * 0.24 * lit;

            gl_FragColor = vec4(col, clamp(a, 0.0, 0.88));
          }
        `}
      />
    </mesh>
  );
}

// ─── 月球 mesh shader（aCrater 分層 alpha）────────────────────────
// 取代純 wireframe 月球：bowl 最透明、surface 中、rim 最不透明
function MobileMoonShader({
  geometry,
  accentColor,
  visibility,
}: {
  geometry: THREE.BufferGeometry;
  accentColor: THREE.Color;
  visibility: number;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uAccent:    { value: accentColor.clone() },
      uOpacity:   { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uAccent.value.copy(accentColor);
  }, [accentColor, uniforms]);

  useFrame(() => {
    uniforms.uOpacity.value = visibility;
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        vertexShader={/* glsl */ `
          attribute float aCrater;
          varying float vCrater;
          varying vec3 vViewNormal;
          varying vec3 vLocalNormal;
          void main() {
            vCrater = aCrater;
            vLocalNormal = normalize(position);
            vViewNormal = normalize(normalMatrix * normalize(position));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uAccent;
          uniform float uOpacity;
          varying float vCrater;
          varying vec3 vViewNormal;
          varying vec3 vLocalNormal;

          void main() {
            float bowl = 1.0 - smoothstep(0.10, 0.48, vCrater);
            float rim = smoothstep(0.62, 1.0, vCrater);
            float surface = smoothstep(0.22, 0.72, vCrater);

            // 月球比地球更淡、更實體：用暖白混 accent，不靠線稿撐形體。
            float light = max(dot(vLocalNormal, normalize(vec3(-0.35, 0.45, 0.82))) * 0.5 + 0.5, 0.38);
            float fresnel = pow(1.0 - max(0.0, vViewNormal.z), 2.2);
            vec3 moonBase = mix(uAccent * 0.28, vec3(0.92, 0.94, 0.84), 0.58);
            vec3 col = moonBase * (0.52 + surface * 0.28 + light * 0.24);
            col *= 1.0 - bowl * 0.28;
            col += vec3(1.0, 0.94, 0.72) * rim * 0.14;
            col += uAccent * fresnel * 0.08;

            float a = (0.34 + surface * 0.18 + rim * 0.16 - bowl * 0.04 + fresnel * 0.05) * uOpacity;
            gl_FragColor = vec4(col, clamp(a, 0.0, 0.66));
          }
        `}
      />
    </mesh>
  );
}

// ─── 手機版海洋量體：在地球核心與陸地板塊之間的真實水面層 ───
// 這層負責「海洋本身有材質」：只在 ocean mask 顯示，陸地由上層 terrain 蓋住。
// 外層 MobileOceanShell 只保留橢圓潮汐包覆感，避免把水面材質蓋成單純藍色光暈。
function MobileOceanVolume({
  accentColor,
  subLunarLocalRef,
  visibility,
  landMaskTex,
}: {
  accentColor: THREE.Color;
  subLunarLocalRef: React.RefObject<THREE.Vector3>;
  visibility: number;
  landMaskTex: THREE.DataTexture | null;
}) {
  const uniforms = useMemo(
    () => ({
      uAccent:       { value: accentColor.clone() },
      uSubLunar:     { value: new THREE.Vector3(1, 0, 0) },
      uBaseRadius:   { value: 1.018 },
      uOpacity:      { value: 0 },
      uLandMask:     { value: landMaskTex },
      uTime:         { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uAccent.value.copy(accentColor);
  }, [accentColor, uniforms]);

  useEffect(() => {
    uniforms.uLandMask.value = landMaskTex;
  }, [landMaskTex, uniforms]);

  useFrame((state, dt) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uOpacity.value = visibility;
    const follow = 1 - Math.exp(-dt * 6.0);
    uniforms.uSubLunar.value.lerp(subLunarLocalRef.current, follow).normalize();
  });

  if (!landMaskTex) return null;

  return (
    <mesh renderOrder={0}>
      <sphereGeometry args={[1.0, 112, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.FrontSide}
        blending={THREE.NormalBlending}
        vertexShader={/* glsl */ `
          #define PI 3.14159265359
          uniform vec3      uSubLunar;
          uniform float     uBaseRadius;
          uniform float     uTime;
          uniform sampler2D uLandMask;
          varying vec3  vSphereNormal;
          varying vec3  vViewNormal;
          varying float vOceanFactor;
          varying float vLegendre;
          varying float vRelief;
          varying float vTideLobe;

          void main() {
            vec3 n = normalize(position);
            vSphereNormal = n;

            float lat = asin(clamp(n.y, -1.0, 1.0));
            float lng = atan(n.z, -n.x);
            vec2 maskUv = vec2((lng + PI) / (2.0 * PI), 0.5 - lat / PI);
            float landMask = texture2D(uLandMask, maskUv).r;
            float oceanFactor = 1.0 - smoothstep(0.20, 0.66, landMask);
            vOceanFactor = oceanFactor;

            float c = dot(n, uSubLunar);
            float legendre = (3.0 * c * c - 1.0) * 0.5;
            vLegendre = legendre;

            // 手機版不要把主要潮汐動畫綁在 vertex displacement，
            // 否則低段數球體會把三角網格輪廓一起帶出來。
            // 這裡保留低頻量體起伏，讓手機版能讀到真正的波峰/波谷。
            float lobe = smoothstep(0.10, 0.96, abs(c));
            vTideLobe = lobe;
            float ellipsoid = legendre * 0.018;

            float angDist = acos(clamp(c, -1.0, 1.0));
            float swellA = sin(angDist * 3.4 - uTime * 0.88 + n.y * 1.5);
            float swellB = sin((n.x - n.z) * 4.2 + n.y * 1.7 + uTime * 0.58);
            float swellC = sin((n.x + n.y * 0.65) * 2.8 - angDist * 1.9 - uTime * 0.43);
            float relief = (swellA * 0.52 + swellB * 0.30 + swellC * 0.18);
            relief *= oceanFactor * (0.24 + lobe * 0.76);
            vRelief = relief;

            float breathe = sin(uTime * 0.34 + n.y * 2.1 + c * 1.7) * 0.0015 * oceanFactor;
            float waveLift = relief * 0.0085;
            vec3 displaced = n * (uBaseRadius * (1.0 + ellipsoid) + lobe * 0.0055 * oceanFactor + breathe + waveLift);

            // 低成本假 normal：用起伏量微調亮暗方向，不真的重算法線。
            vec3 viewN = normalize(normalMatrix * n);
            vViewNormal = normalize(viewN + normalize(normalMatrix * vec3(relief * 0.10, relief * 0.04, -relief * 0.08)));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          #define PI 3.14159265359
          uniform vec3      uAccent;
          uniform vec3      uSubLunar;
          uniform float     uOpacity;
          uniform float     uTime;
          varying vec3  vSphereNormal;
          varying vec3  vViewNormal;
          varying float vOceanFactor;
          varying float vLegendre;
          varying float vRelief;
          varying float vTideLobe;

          void main() {
            if (vOceanFactor < 0.035) discard;

            float oceanEdge = smoothstep(0.14, 0.70, vOceanFactor);
            float dotSub = dot(vSphereNormal, uSubLunar);
            float axisWater = smoothstep(-0.25, 1.0, vLegendre);
            float angDistSub = acos(clamp(dotSub, -1.0, 1.0));
            float tideLobe = smoothstep(0.12, 0.96, abs(dotSub));
            float frontLobe = smoothstep(1.75, 0.08, angDistSub);
            float backLobe = smoothstep(1.75, 0.08, acos(clamp(-dotSub, -1.0, 1.0)));

            // 海洋表面紋理由 fragment 直接算，讓動畫在每個 pixel 上連續，
            // 避免固定掃描環與斑馬紋；只保留低頻、寬面積的流體起伏。
            float flowA = sin(angDistSub * 3.2 - uTime * 0.46 + vSphereNormal.y * 1.4) * 0.5 + 0.5;
            float flowB = sin((vSphereNormal.x - vSphereNormal.z) * 3.8 + vSphereNormal.y * 1.8 + uTime * 0.31) * 0.5 + 0.5;
            float flowC = sin((vSphereNormal.x + vSphereNormal.y * 0.7) * 2.7 - angDistSub * 1.6 - uTime * 0.24) * 0.5 + 0.5;
            float current = smoothstep(0.18, 0.88, flowA * 0.46 + flowB * 0.34 + flowC * 0.20);
            current *= oceanEdge * (0.35 + vTideLobe * 0.65);

            float facing = pow(max(0.0, dotSub), 1.5);
            float backFacing = pow(max(0.0, -dotSub), 1.9);
            float rim = pow(1.0 - max(0.0, vViewNormal.z), 2.6);
            // 海岸附近只淡出，不再加亮；避免跟陸地鋸齒邊與海岸線錯位時互相衝突。
            float coastFade = smoothstep(0.22, 0.82, vOceanFactor);
            float reliefPeak = smoothstep(0.10, 0.74, vRelief * 0.5 + 0.5);
            float reliefTrough = smoothstep(0.12, 0.70, -vRelief * 0.5 + 0.5);
            float microGrain = sin((vSphereNormal.x * 43.0 + vSphereNormal.y * 67.0 + vSphereNormal.z * 31.0) + uTime * 0.18) * 0.5 + 0.5;
            microGrain = smoothstep(0.36, 0.92, microGrain);

            float intensity =
              0.14 +
              axisWater * 0.18 +
              current * 0.14 +
              frontLobe * 0.16 +
              backLobe * 0.10 +
              reliefPeak * 0.14 -
              reliefTrough * 0.08 +
              facing * 0.08 +
              backFacing * 0.05 +
              rim * 0.10;

            vec3 col = uAccent * intensity;
            col += uAccent * microGrain * 0.035 * tideLobe;
            col += vec3(1.0, 0.96, 0.78) * ((frontLobe + backLobe) * 0.09 + reliefPeak * 0.12 + current * 0.05);

            float alpha = (0.18 + axisWater * 0.07 + current * 0.06 + reliefPeak * 0.09 + (frontLobe + backLobe) * 0.06 + microGrain * 0.035) * oceanEdge * coastFade * uOpacity;
            gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.52));
          }
        `}
      />
    </mesh>
  );
}

// ─── 海洋薄膜 shell（外層橢圓潮汐包覆）─────────────────────────
// 設計理念：用 ShaderMaterial 寫一層極薄的球殼，每幀只改 3 個 uniform float
// 不每幀改 buffer、不加 lineSegments、不加 points → 對手機效能近乎免費
//
// Fragment shader 行為：
//   1. 朝月球面 + 反月球面 → 雙向潮汐隆起亮度
//   2. 低頻流體起伏 → 避免斑馬紋與固定掃描環
//   3. 邊緣 fresnel-ish rim → 球緣稍亮，加強海洋輪廓辨識
function MobileOceanShell({
  accentColor,
  subLunarRef,
  earthSpinRef,
  visibility,
  landMaskTex,
}: {
  accentColor: THREE.Color;
  subLunarRef: React.RefObject<THREE.Vector3>;
  earthSpinRef: React.RefObject<THREE.Group | null>;
  /** boot 期間 0 → 1 淡入 */
  visibility: number;
  /** 256×128 land mask DataTexture（sample > threshold 視為陸地）
   *  shader 會在陸地處削弱 wave，避免 wave 蓋過海岸線 */
  landMaskTex: THREE.DataTexture | null;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const tmpQuatInv = useRef(new THREE.Quaternion());
  const tmpSubLLocal = useRef(new THREE.Vector3());

  // uniforms 一次性建立，引用穩定（避免 React re-render 重建 material）
  const uniforms = useMemo(
    () => ({
      uAccent:       { value: accentColor.clone() },
      uSubLunar:     { value: new THREE.Vector3(1, 0, 0) },
      uBaseRadius:   { value: 1.145 },
      uOpacity:      { value: 0 },
      uLandMask:     { value: landMaskTex },
      uTime:         { value: 0 },
    }),
    // accentColor / landMaskTex 變化由下方 useEffect 同步進 uniform，不重建 material
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // landMaskTex 變化（首次載入完成）→ 同步 uniform
  useEffect(() => {
    uniforms.uLandMask.value = landMaskTex;
  }, [landMaskTex, uniforms]);

  // 主題切換時更新 accent uniform（不重建 material）
  useEffect(() => {
    uniforms.uAccent.value.copy(accentColor);
  }, [accentColor, uniforms]);

  useFrame((state, dt) => {
    if (!subLunarRef.current) return;

    // 把 sub-lunar world 方向轉成 earth-local（model space）
    const eg = earthSpinRef.current;
    if (eg) {
      eg.getWorldQuaternion(tmpQuatInv.current).invert();
      tmpSubLLocal.current.copy(subLunarRef.current).applyQuaternion(tmpQuatInv.current).normalize();
    } else {
      tmpSubLLocal.current.copy(subLunarRef.current).normalize();
    }
    const follow = 1 - Math.exp(-dt * 6.0);
    uniforms.uSubLunar.value.lerp(tmpSubLLocal.current, follow).normalize();

    uniforms.uOpacity.value = visibility;
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh renderOrder={8}>
      {/* base radius 由 shader 的 uBaseRadius 控制，避免 geometry radius / vertex displacement 混用後難以判斷實際外殼位置。 */}
      <sphereGeometry args={[1.0, 84, 52]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        // NormalBlending：dark theme + light theme 都看得到 shell
        // Additive 在白底上會完全消失（白 + accent ≈ 白）
        blending={THREE.NormalBlending}
        vertexShader={/* glsl */ `
          #define PI 3.14159265359
          uniform vec3      uSubLunar;
          uniform float     uTime;
          uniform float     uBaseRadius;
          uniform sampler2D uLandMask;
          varying vec3 vSphereNormal;
          varying vec3 vViewNormal;
          varying float vLegendre;       // P2 軸極隆起係數（fragment 用於水彩漸層）

          void main() {
            vec3 sphereN = normalize(position);
            vSphereNormal = sphereN;

            // 採 land mask：陸地處 vertex displacement = 0（不擾動陸地下的海殼）
            float lat = asin(clamp(sphereN.y, -1.0, 1.0));
            float lng = atan(sphereN.z, -sphereN.x);
            vec2 maskUv = vec2((lng + PI) / (2.0 * PI), 0.5 - lat / PI);
            float landMask = texture2D(uLandMask, maskUv).r;
            float oceanFactor = 1.0 - smoothstep(0.30, 0.55, landMask);

            // ─── P2 Legendre 橢圓拉長（科學潮汐模型）──────────────
            //   沿 sub-lunar 軸的兩極都凸（朝月球面 + 反面），赤道腰部凹
            //   公式：(3·cos²θ − 1) / 2 ← 軸極=1、赤道=−0.5
            //   AMP 0.095 = 軸極明顯凸出；赤道內縮後仍在 terrain max 外側
            float c = dot(sphereN, uSubLunar);
            float legendre = (3.0 * c * c - 1.0) * 0.5;
            vLegendre = legendre;
            // 外層殼的 silhouette 保持平滑穩定，只保留橢圓潮汐包覆感。
            float ellipsoid = legendre * 0.058;
            vec3 displaced = sphereN * (uBaseRadius * (1.0 + ellipsoid));
            vViewNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          #define PI 3.14159265359
          uniform vec3      uAccent;
          uniform vec3      uSubLunar;
          uniform float     uOpacity;
          uniform float     uTime;
          uniform sampler2D uLandMask;
          varying vec3  vSphereNormal;
          varying vec3  vViewNormal;
          varying float vLegendre;     // P2 軸極隆起（vertex 已算）

          void main() {
            // ─── Land mask 採樣 ─────────────────────────────────
            float lat = asin(clamp(vSphereNormal.y, -1.0, 1.0));
            float lng = atan(vSphereNormal.z, -vSphereNormal.x);
            vec2 maskUv = vec2((lng + PI) / (2.0 * PI), 0.5 - lat / PI);
            float landMask = texture2D(uLandMask, maskUv).r;
            float landFactor = smoothstep(0.30, 0.55, landMask);
            float oceanFactor = 1.0 - landFactor;
            // 海洋 1.0 / 陸地 0.35：殼仍跨過整顆球，但陸地上較淡，不搶海岸線。
            float oceanWeight = mix(0.35, 1.0, oceanFactor);

            // 外層只做潮汐包覆輪廓；海面材質由 MobileOceanVolume 負責。
            float baseline = 0.11;

            // 軸極水彩（軸極區最深、赤道淡）
            float axisWatercolor = smoothstep(-0.35, 1.0, vLegendre) * 0.48;

            // 朝月球面 hemisphere
            float dotSub = dot(vSphereNormal, uSubLunar);
            float facing = max(0.0, dotSub);
            float baseGlow = pow(facing, 1.4) * 0.22;
            // 反月球面（背面潮汐軸極）
            float backFacing = max(0.0, -dotSub);
            float backGlow = pow(backFacing, 1.8) * 0.16;

            float angDist = acos(clamp(dotSub, -1.0, 1.0));
            float tideLobe = smoothstep(0.12, 0.96, abs(dotSub));

            // 外層只做低頻流體起伏，不再畫固定擴散環。
            float flowA = sin(angDist * 2.8 - uTime * 0.34 + vSphereNormal.y * 1.2) * 0.5 + 0.5;
            float flowB = sin((vSphereNormal.x - vSphereNormal.z) * 2.4 + uTime * 0.23) * 0.5 + 0.5;
            float current = smoothstep(0.22, 0.84, flowA * 0.62 + flowB * 0.38) * (0.04 + tideLobe * 0.10);

            // Rim fresnel — 球緣輪廓
            float fresnel = pow(1.0 - max(0.0, vViewNormal.z), 2.5);
            float rim = fresnel * 0.16;

            // 合成：baseline 永遠存在 + 其他 term × oceanWeight
            float intensity = baseline + (axisWatercolor + baseGlow + backGlow + current + rim) * oceanWeight;
            vec3 col = uAccent * intensity;
            // 波峰白光點綴
            col += vec3(1.0, 1.0, 0.92) * (current * 0.12 + tideLobe * 0.05) * oceanWeight;

            // alpha 保底：baseline × uOpacity 即可確保殼可見
            float a = clamp(intensity * uOpacity, 0.0, 0.46);
            gl_FragColor = vec4(col, a);
          }
        `}
      />
    </mesh>
  );
}

// ─── GlobeInner（主場景） ────────────────────────────────────────
interface GlobeInnerProps {
  phase: Phase;
  skipBoot: boolean;
  dissolveProgress: number;
  accentColor: THREE.Color;
  bgDeepColor: THREE.Color;
  geoData: GeoJSONFeatureCollection | null;
}

function GlobeInner({ phase, skipBoot, dissolveProgress, accentColor, bgDeepColor, geoData }: GlobeInnerProps) {
  const dissolveRef = useRef<THREE.Group>(null);
  const earthSpinRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const halo2Ref = useRef<THREE.Mesh>(null);
  const subLunarRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 0, 0));
  // sub-lunar 在 earth-local 空間（每幀更新，給 terrain shader 共用）
  const subLunarLocalRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 0, 0));
  // 月球狀態機（共享給地球 onPointerDown：避免月球 grabbed 時雙物件搶 drag）
  const moonStateRef = useRef<MoonState>("orbiting");
  // 經緯線背景
  const backdrop = useMemo(() => buildLatLngBackdrop(1.0), []);
  // Heightmap（給地形球 + 海岸線 + ocean shell land mask 用）
  const heightmap = useMemo(() => {
    if (!geoData) return null;
    return buildHeightmap(geoData);
  }, [geoData]);
  // Land mask DataTexture：給 ocean shell shader 採樣，讓 wave 在陸地處被弱化
  const landMaskTex = useMemo(() => {
    if (!heightmap) return null;
    const W = 256, H = 128;
    const data = new Uint8Array(W * H * 4);
    for (let i = 0; i < heightmap.length; i++) {
      data[i * 4]     = heightmap[i];
      data[i * 4 + 1] = heightmap[i];
      data[i * 4 + 2] = heightmap[i];
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }, [heightmap]);
  // 地形球：mesh 帶 landFactor + elevation attributes
  // 144×72 (2.25× vertex count 比 96×48) — 板塊輪廓更平滑、起伏更精細
  const terrainSphere = useMemo(() => {
    if (!heightmap) return null;
    return buildTerrainSphere({ heightmap, segmentsW: 144, segmentsH: 72 });
  }, [heightmap]);
  // 海岸線（依賴 GeoJSON）
  const coastlines = useMemo(() => {
    if (!geoData) return null;
    return buildCoastlines(geoData, 1.018);
  }, [geoData]);

  const starPositions = useMemo(() => buildStarPositions(), []);

  const { camera, clock, size } = useThree();
  const startRef = useRef<number | null>(null);
  const pauseEndRef = useRef<number>(-1);
  const snapTargetYRef = useRef<number | null>(null);

  // ─── 地球雙軸拖拽（手機觸控 + DevTools 模擬都 work） ─────────
  // 水平拖 → rotation.y、垂直拖 → rotation.x
  // 放開 → spring back 到拖拽前的姿態，繼續正常自轉
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartRotYRef = useRef(0);
  const dragStartRotXRef = useRef(0);
  const springBackTargetRef = useRef<{ x: number; y: number } | null>(null);
  const activeEarthPointerIdRef = useRef<number | null>(null);
  const earthCaptureTargetRef = useRef<Element | null>(null);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (!isDraggingRef.current) return;
      if (
        activeEarthPointerIdRef.current !== null &&
        e.pointerId !== activeEarthPointerIdRef.current
      ) {
        return;
      }
      e.preventDefault();
      const eg = earthSpinRef.current;
      if (!eg) return;
      const dx = e.clientX - dragStartXRef.current;
      const dy = e.clientY - dragStartYRef.current;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
      if (didDragRef.current) {
        // 每 1000px 位移 ≈ 360° 旋轉（同桌面版手感）
        eg.rotation.y = dragStartRotYRef.current + (dx / 1000) * Math.PI * 2;
        eg.rotation.x = dragStartRotXRef.current + (dy / 1000) * Math.PI * 2;
      }
    }
    function handleUp(e: PointerEvent) {
      if (!isDraggingRef.current) return;
      if (
        activeEarthPointerIdRef.current !== null &&
        e.pointerId !== activeEarthPointerIdRef.current
      ) {
        return;
      }
      isDraggingRef.current = false;
      if (
        earthCaptureTargetRef.current &&
        activeEarthPointerIdRef.current !== null &&
        earthCaptureTargetRef.current.hasPointerCapture?.(activeEarthPointerIdRef.current)
      ) {
        earthCaptureTargetRef.current.releasePointerCapture(activeEarthPointerIdRef.current);
      }
      activeEarthPointerIdRef.current = null;
      earthCaptureTargetRef.current = null;
      if (didDragRef.current) {
        // 雙軸 spring back
        springBackTargetRef.current = {
          x: dragStartRotXRef.current,
          y: dragStartRotYRef.current,
        };
      } else {
        // 純點擊（沒有超過 4px 拖拽門檻）→ snap 到台灣
        const eg = earthSpinRef.current;
        if (!eg) return;
        const targetY = -Math.atan2(TAIWAN_POS.x, TAIWAN_POS.z);
        const TWO_PI = Math.PI * 2;
        const curMod = ((eg.rotation.y % TWO_PI) + TWO_PI) % TWO_PI;
        const tgtMod = ((targetY % TWO_PI) + TWO_PI) % TWO_PI;
        let delta = tgtMod - curMod;
        if (delta > Math.PI) delta -= TWO_PI;
        if (delta < -Math.PI) delta += TWO_PI;
        snapTargetYRef.current = eg.rotation.y + delta;
      }
    }
    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  // ─── D3 · 經線位移（球體被月球拉長感）──────────────────────────
  // 每幀更新 backdrop position：原始 unit × (baseRadius + bulge)
  // bulge 大小依「該頂點與 sub-lunar 點的角距離」遞減
  const tmpEarthQuatInv = useRef(new THREE.Quaternion());
  const tmpSubLLocal = useRef(new THREE.Vector3());

  useFrame(() => {
    const dg = dissolveRef.current;
    const eg = earthSpinRef.current;
    if (!dg || !eg) return;

    if (startRef.current === null) {
      startRef.current = clock.elapsedTime * 1000;
    }
    const elapsed = clock.elapsedTime * 1000 - startRef.current;

    // 自轉 / 拖拽 / snap 狀態機
    if (isDraggingRef.current) {
      // pointermove 直接寫入 rotation.x / .y
    } else if (springBackTargetRef.current !== null) {
      // 雙軸 spring back（X + Y 同時指數緩出回到拖拽前姿態）
      const tgt = springBackTargetRef.current;
      const distX = tgt.x - eg.rotation.x;
      const distY = tgt.y - eg.rotation.y;
      if (Math.abs(distX) < 0.003 && Math.abs(distY) < 0.003) {
        eg.rotation.x = tgt.x;
        eg.rotation.y = tgt.y;
        springBackTargetRef.current = null;
      } else {
        eg.rotation.x += distX * 0.08;
        eg.rotation.y += distY * 0.08;
      }
    } else if (snapTargetYRef.current !== null) {
      const dist = snapTargetYRef.current - eg.rotation.y;
      if (Math.abs(dist) < 0.003) {
        eg.rotation.y = snapTargetYRef.current;
        snapTargetYRef.current = null;
        pauseEndRef.current = clock.elapsedTime + 5;
      } else {
        eg.rotation.y += dist * 0.08;
      }
    } else if (clock.elapsedTime >= pauseEndRef.current) {
      eg.rotation.y += SPIN_SPEED;
    }

    // Camera：手機直立比例 base = 4.6
    const baseZ = size.width < size.height ? 4.6 : 4.0;
    if (skipBoot) {
      camera.position.z = baseZ;
    } else if (phase === "boot-0") {
      const t = Math.min(1, elapsed / 1200);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.z = baseZ + 4 - 4 * eased;
    } else if (phase === "boot-1") {
      camera.position.z = baseZ;
    } else if (phase === "boot-2") {
      const t = Math.min(1, (elapsed - 3000) / 1600);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.z = baseZ - 0.5 * eased;
      const targetY = -Math.atan2(TAIWAN_POS.x, TAIWAN_POS.z);
      const targetX = Math.atan2(TAIWAN_POS.y, Math.sqrt(TAIWAN_POS.x ** 2 + TAIWAN_POS.z ** 2));
      eg.rotation.y = THREE.MathUtils.lerp(eg.rotation.y, targetY, eased * 0.12);
      eg.rotation.x = THREE.MathUtils.lerp(eg.rotation.x, targetX, eased * 0.12);
    } else if (phase === "boot-3") {
      const t = Math.min(1, (elapsed - 4600) / 800);
      camera.position.z = (baseZ - 0.5) + 0.5 * t;
    } else {
      camera.position.z = baseZ;
    }

    // Dissolve
    dg.position.x = 0.4 + dissolveProgress * 0.3;
    dg.position.y = dissolveProgress * 0.05;
    const scale = 1.0 * (1 - dissolveProgress * 0.2);
    dg.scale.setScalar(scale);

    // Taiwan pin 雙環脈衝
    const PULSE_PERIOD = 2600;
    if (haloRef.current) {
      const p = (elapsed % PULSE_PERIOD) / PULSE_PERIOD;
      haloRef.current.scale.setScalar(1 + p * 2.0);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * Math.sin(p * Math.PI);
    }
    if (halo2Ref.current) {
      const p = ((elapsed + PULSE_PERIOD * 0.5) % PULSE_PERIOD) / PULSE_PERIOD;
      halo2Ref.current.scale.setScalar(1 + p * 2.0);
      (halo2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * Math.sin(p * Math.PI);
    }

    // ─── D3 · 球體 outward 位移（同時作用於 backdrop 跟 terrain sphere） ──
    // 把 sub-lunar 從 world 轉到 earth-local（earthSpin 內部的座標系）
    // 同時把這個值寫進 subLunarLocalRef，給 terrain shader / ocean shell 共用
    eg.getWorldQuaternion(tmpEarthQuatInv.current).invert();
    tmpSubLLocal.current.copy(subLunarRef.current).applyQuaternion(tmpEarthQuatInv.current).normalize();
    subLunarLocalRef.current.copy(tmpSubLLocal.current);
    const sx = tmpSubLLocal.current.x;
    const sy = tmpSubLLocal.current.y;
    const sz = tmpSubLLocal.current.z;
    const falloffRad = (D3_BULGE_FALLOFF_DEG * Math.PI) / 180;

    // 共用 inline helper：對一組 vertex 套 D3 displacement
    // 寫成 inline 避免 closure 邊界帶來的優化阻礙
    const applyD3 = (
      positions: Float32Array,
      units: Float32Array,
      baseRadii: Float32Array,
    ) => {
      const n = baseRadii.length;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const ux = units[i3], uy = units[i3 + 1], uz = units[i3 + 2];
        const dot = Math.max(-1, Math.min(1, ux * sx + uy * sy + uz * sz));
        const angDist = Math.acos(dot);
        const factor = angDist < falloffRad
          ? (1 - angDist / falloffRad) * (1 - angDist / falloffRad)
          : 0;
        const r = baseRadii[i] + factor * D3_BULGE_AMOUNT;
        positions[i3]     = ux * r;
        positions[i3 + 1] = uy * r;
        positions[i3 + 2] = uz * r;
      }
    };

    // 1) 背景網格（淡，但有 D3 起伏）
    applyD3(
      backdrop.geom.attributes.position.array as Float32Array,
      backdrop.unitVecs,
      backdrop.baseRadii,
    );
    backdrop.geom.attributes.position.needsUpdate = true;

    // 2a) 地形 mesh（板塊面 + flatShading 陰影 + D3）
    //     mesh 跟 wireframe 各自獨立 geometry，需分別 D3
    if (terrainSphere) {
      applyD3(
        terrainSphere.meshGeometry.attributes.position.array as Float32Array,
        terrainSphere.meshUnitVecs,
        terrainSphere.meshBaseRadii,
      );
      terrainSphere.meshGeometry.attributes.position.needsUpdate = true;

      // 2b) 同源海岸邊線（marching squares 從 land mask 抽）— 主視覺保留
      applyD3(
        terrainSphere.coastlineGeometry.attributes.position.array as Float32Array,
        terrainSphere.coastlineUnitVecs,
        terrainSphere.coastlineBaseRadii,
      );
      terrainSphere.coastlineGeometry.attributes.position.needsUpdate = true;

      // wireGeometry / ridgeGeometry 已不渲染（同心圓等高線視覺太假已棄用）
      // geometry 仍由 buildTerrainSphere 產出但不在此更新 D3，省每幀 CPU
    }

    // (光照已從 directionalLight 改成 terrain shader 內部用 uSubLunarLocal 算
    //  陰影對齊 D3 隆起的板塊，視覺一致且零 GPU lighting overhead)
  });

  const moonVisibility = (() => {
    if (skipBoot) return 1;
    if (phase === "boot-0" || phase === "boot-1" || phase === "boot-2") return 0;
    if (phase === "boot-3") return 0.5;
    return 1;
  })();

  return (
    <>
      {/* terrain shader 自己算 lighting（用 vSphereNormal × uSubLunarLocal）
          不需要 directionalLight，省一個 light pass */}

      <group ref={dissolveRef}>
        <group rotation-z={EARTH_AXIAL_TILT_RAD}>
          <group ref={earthSpinRef}>
            {/* 地球核心背面殼：BackSide 只渲染球的內表面
                作用：給後半球的 wireframe / mesh 提供深色背景，避免穿透看到背景星
                但前半球完全不擋（front face culled），保留透明線稿地球感
                顏色用 --bg-deep token，不 hardcode */}
            <mesh>
              <sphereGeometry args={[0.985, 32, 16]} />
              <meshBasicMaterial
                color={bgDeepColor}
                transparent
                opacity={0.65}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>

            {/* Layer 1: 經緯線背景網格（極淡 — 只當「球體存在感」參考）
                opacity 從 0.18 大幅降到 0.06 → 不再搶走地形球的注意力
                仍保留 D3 月球方向 outward 位移，視覺穩定 */}
            <lineSegments geometry={backdrop.geom}>
              <lineBasicMaterial
                color={accentColor}
                transparent
                opacity={0.06}
                depthWrite={false}
              />
            </lineSegments>

            {/* Layer 2: 海洋 surface volume
                位置在地球核心與陸地板塊之間；shader 用同一張 land mask 只顯示海洋。
                這層承擔手機版可見的水面材質、低頻洋流與潮汐隆起。 */}
            <MobileOceanVolume
              accentColor={accentColor}
              subLunarLocalRef={subLunarLocalRef}
              visibility={moonVisibility}
              landMaskTex={landMaskTex}
            />

            {/* Layer 3a: 陸地 mask 填色面
                完整球面用 aLandFactor 切出陸地，不再用三角外框當海岸線。
                aElevation 提供大陸內部階梯深淺，避免只有單純填色。 */}
            {terrainSphere && (
              <MobileTerrainShader
                geometry={terrainSphere.meshGeometry}
                accentColor={accentColor}
                subLunarLocalRef={subLunarLocalRef}
              />
            )}

            {/* Layer 3b: heightmap coastline — marching squares 從 land mask 抽 contour
                比 triangle edge 平滑，同時與 shader mask 同源。 */}
            {terrainSphere && (
              <lineSegments geometry={terrainSphere.coastlineGeometry} renderOrder={3}>
                <lineBasicMaterial
                  color={accentColor}
                  transparent
                  opacity={0.88}
                  depthWrite={false}
                />
              </lineSegments>
            )}

            {/* Layer 3c / 3d 已棄用（同心圓等高線太假）
                陸地起伏改靠 MobileTerrainShader 的 8 階階梯填色 + 暖白 highlight 表達 */}

            {/* Layer 5: 台灣海岸線（主視覺，vertexColors 給 D2 脈動用） */}
            {coastlines && (
              <lineSegments geometry={coastlines.taiwan}>
                <lineBasicMaterial
                  vertexColors
                  transparent
                  opacity={1.0}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </lineSegments>
            )}

            {/* Layer 6: 海洋 ambient 薄膜（shader-only）
                朝月球面有基底亮度、橢圓殼跟隨月球方向、球緣有 fresnel 提亮
                uLandMask 採樣：陸地處 wave/glow 全部 fade，不蓋過海岸線 */}
            <MobileOceanShell
              accentColor={accentColor}
              subLunarRef={subLunarRef}
              earthSpinRef={earthSpinRef}
              visibility={moonVisibility}
              landMaskTex={landMaskTex}
            />

            {/* Layer 7: Atmosphere wireframe shell（極淡） */}
            <lineSegments>
              <wireframeGeometry args={[new THREE.SphereGeometry(1.06, 16, 12)]} />
              <lineBasicMaterial color={accentColor} transparent opacity={0.08} depthWrite={false} />
            </lineSegments>

            {/* Taiwan pin（保留三層結構） */}
            <mesh position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <sphereGeometry args={[0.014, 12, 8]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <ringGeometry args={[0.020, 0.024, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <mesh ref={haloRef} position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <ringGeometry args={[0.020, 0.023, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh ref={halo2Ref} position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <ringGeometry args={[0.020, 0.023, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* 互動球殼：點擊 → snap 台灣；拖拽 → 全軸自由旋轉，放開彈回 */}
            <mesh
              frustumCulled={false}
              onPointerDown={(e) => {
                // 月球 grabbed 中時不啟動地球拖拽（避免雙物件搶 drag）
                if (moonStateRef.current === "grabbed") return;
                e.nativeEvent.preventDefault();

                isDraggingRef.current = true;
                didDragRef.current = false;
                activeEarthPointerIdRef.current = e.nativeEvent.pointerId;
                const target = e.nativeEvent.target as Element | null;
                if (target?.setPointerCapture) {
                  target.setPointerCapture(e.nativeEvent.pointerId);
                  earthCaptureTargetRef.current = target;
                }
                // 同時記錄 X+Y pointer 跟 X+Y rotation，handleMove 才能算雙軸 dx/dy
                dragStartXRef.current = e.nativeEvent.clientX;
                dragStartYRef.current = e.nativeEvent.clientY;
                dragStartRotYRef.current = earthSpinRef.current?.rotation.y ?? 0;
                dragStartRotXRef.current = earthSpinRef.current?.rotation.x ?? 0;
                snapTargetYRef.current = null;
                springBackTargetRef.current = null;
                // 不呼叫 e.stopPropagation()：R3F 的 stopPropagation 會 cancel native event
                // 導致 window pointermove/up listener 收不到事件，拖拽完全不觸發
              }}
            >
              <sphereGeometry args={[1.1, 16, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>

        {/* 月球（low-poly wireframe，寫入 sub-lunar 給潮汐用） */}
        <MoonLite
          accentColor={accentColor}
          visibility={moonVisibility}
          subLunarRef={subLunarRef}
          moonStateRef={moonStateRef}
        />
      </group>

      {/* 背景星點 */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.025} transparent opacity={0.4} sizeAttenuation />
      </points>
    </>
  );
}

// ─── 對外元件 ────────────────────────────────────────────────────
interface GlobeSceneMobileProps {
  phase: Phase;
  skipBoot: boolean;
  dissolveProgress: number;
  style?: React.CSSProperties;
}

export function GlobeSceneMobile({ phase, skipBoot, dissolveProgress, style }: GlobeSceneMobileProps) {
  const [accentColor, setAccentColor] = useState<THREE.Color>(() => readAccentColor());
  const [bgDeepColor, setBgDeepColor] = useState<THREE.Color>(() => readBgDeepColor());
  const [geoData, setGeoData] = useState<GeoJSONFeatureCollection | null>(null);

  // 主題切換 → 同步 accent + bg-deep token
  useEffect(() => {
    const sync = () => {
      setAccentColor(readAccentColor());
      setBgDeepColor(readBgDeepColor());
    };
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => obs.disconnect();
  }, []);

  // 載入 GeoJSON（給海岸線用）
  useEffect(() => {
    let cancelled = false;
    fetch("/data/ne_110m_land.json")
      .then((r) => r.json() as Promise<GeoJSONFeatureCollection>)
      .then((data) => {
        if (!cancelled) setGeoData(data);
      })
      .catch((err) => {
        console.warn("[GlobeSceneMobile] failed to load ne_110m_land:", err);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...style,
      }}
    >
      <Canvas
        camera={{ fov: 50, near: 0.01, far: 1000, position: [0, 0, 4.6] }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent", touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.style.touchAction = "none";
        }}
      >
        <GlobeInner
          phase={phase}
          skipBoot={skipBoot}
          dissolveProgress={dissolveProgress}
          accentColor={accentColor}
          bgDeepColor={bgDeepColor}
          geoData={geoData}
        />
      </Canvas>
    </div>
  );
}
