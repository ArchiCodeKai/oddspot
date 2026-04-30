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

// ─── 潮汐參數（強化版：所有效果都可肉眼辨識） ───────────────────────
// D1 同心圓擴散：每 RIPPLE_INTERVAL 秒從月球 sub-lunar 點觸發一個圓圈
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
const MOON_SELF_ROTATION = 0.12; // rad/sec，月球自轉速度（比公轉慢）

function MoonLite({
  accentColor,
  visibility,
  subLunarRef,
}: {
  accentColor: THREE.Color;
  visibility: number;
  /** 把月球 sub-lunar 點（地心 → 月球 unit vector）寫進這個 ref，給潮汐用 */
  subLunarRef: React.RefObject<THREE.Vector3>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const moonBodyRef = useRef<THREE.Group>(null);
  const moonSelfRef = useRef<THREE.Group>(null);
  const matWireRef = useRef<THREE.LineBasicMaterial>(null);
  const tmpVec = useRef(new THREE.Vector3());

  // 一次 build 月球 mesh + wireframe（含 aCrater attribute）
  const moonTerrain = useMemo(
    () => buildMoonTerrainSphere({ moonRadius: MOON_RADIUS, segmentsW: 32, segmentsH: 16 }),
    [],
  );

  useFrame((state, dt) => {
    const g = groupRef.current;
    const body = moonBodyRef.current;
    const self = moonSelfRef.current;
    if (!g || !body) return;
    g.rotation.y = state.clock.elapsedTime * (2 * Math.PI / MOON_ORBIT_PERIOD_SEC);
    if (self) self.rotation.y += dt * MOON_SELF_ROTATION;
    if (matWireRef.current) matWireRef.current.opacity = visibility * 0.18;

    body.getWorldPosition(tmpVec.current);
    tmpVec.current.normalize();
    if (subLunarRef.current) subLunarRef.current.copy(tmpVec.current);
  });

  return (
    <group ref={groupRef} rotation-x={MOON_ORBIT_INCLINE_RAD}>
      <group ref={moonBodyRef} position={[MOON_ORBIT_RADIUS, 0, 0]}>
        <group ref={moonSelfRef}>
          {/* Mesh 分層 alpha：bowl 透、surface 中、rim 不透 — 替代原本實心深色殼 */}
          <MobileMoonShader
            geometry={moonTerrain.meshGeometry}
            accentColor={accentColor}
            visibility={visibility}
          />

          {/* 輔助線框：opacity 0.18 — 大幅淡化（之前 0.40 太搶眼）
              只當「crater 邊界提示」，主視覺交給 mesh shader 的 alpha 分層 */}
          <lineSegments geometry={moonTerrain.wireGeometry}>
            <lineBasicMaterial
              ref={matWireRef}
              color={accentColor}
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </lineSegments>
        </group>
      </group>
    </group>
  );
}

// ─── Ripple state shared between TideRipples + MobileOceanShell ──
// 提到外層讓 ocean shell 也讀同一份 wave-front 進度（不重複計時器）
type RippleState = {
  age: number;
  live: boolean;
  originX: number; originY: number; originZ: number;
  nextSpawnAt: number;
};

// ─── 同心圓潮汐元件（D1） ────────────────────────────────────────
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
            if (vLandFactor < 0.035) discard;

            // 階梯化高程：12 階比 8 階更精細、地形分布更密
            // 配合三倍 segments 細分，陸地內部讀得出更多層次
            float stepped = floor(clamp(vElevation, 0.0, 1.0) * 12.0) / 12.0;

            // Alpha 分層加深：低地 0.55 起跳、最高 1.10（會被 clamp）
            // 比之前更深，陸地實感更強
            float edge = smoothstep(0.05, 0.35, vLandFactor);
            float a = (0.55 + stepped * 0.55) * edge;

            // Lighting：朝月球面被照亮
            float dotSub = dot(vSphereNormal, uSubLunarLocal);
            float lit = max(dotSub * 0.5 + 0.5, 0.50);

            // Color：低地 0.50、高地 1.40（再加深）
            float colorMul = (0.50 + stepped * 0.90) * lit;
            vec3 col = uAccent * colorMul;

            // 高地暖白 highlight 加強：山脊白光更亮（0.22 → 0.32）
            float highMask = smoothstep(0.40, 0.85, stepped);
            col += vec3(1.0, 0.88, 0.50) * highMask * 0.32 * lit;

            gl_FragColor = vec4(col, clamp(a, 0.0, 0.96));
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
          varying vec3 vSphereNormal;
          void main() {
            vCrater = aCrater;
            vSphereNormal = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uAccent;
          uniform float uOpacity;
          varying float vCrater;
          varying vec3 vSphereNormal;

          void main() {
            // 整體淡化（網格顏色太明顯 → 降一階）
            // bowl alpha 0.06、surface 0.20、rim 0.40（之前 0.10 / 0.32 / 0.65）
            float a = mix(0.06, 0.40, vCrater);
            float colorMul = mix(0.40, 0.78, vCrater);

            // 簡單 view-rim highlight（球緣稍亮）
            float fresnel = pow(1.0 - max(0.0, vSphereNormal.z), 2.0);
            colorMul += fresnel * 0.10;

            vec3 col = uAccent * colorMul;
            gl_FragColor = vec4(col, a * uOpacity);
          }
        `}
      />
    </mesh>
  );
}

// ─── 海洋薄膜 shell（D1/D2 之外的 ambient 潮汐視覺）──────────────
// 設計理念：用 ShaderMaterial 寫一層極薄的球殼，每幀只改 3 個 uniform float
// 不每幀改 buffer、不加 lineSegments、不加 points → 對手機效能近乎免費
//
// Fragment shader 行為：
//   1. 朝月球面 hemisphere → 微弱基底亮度（潮汐隆起區）
//   2. wave-front 經過時 → 球面距離跟 uWaveFrontRad 接近的 fragment 提亮
//   3. 邊緣 fresnel-ish rim → 球緣稍亮，加強海洋輪廓辨識
function MobileOceanShell({
  accentColor,
  subLunarRef,
  earthSpinRef,
  rippleStateRef,
  visibility,
  landMaskTex,
}: {
  accentColor: THREE.Color;
  subLunarRef: React.RefObject<THREE.Vector3>;
  earthSpinRef: React.RefObject<THREE.Group | null>;
  rippleStateRef: React.RefObject<RippleState>;
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
      uWaveFrontRad: { value: -1 },
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

  useFrame((state) => {
    if (!subLunarRef.current) return;

    // 把 sub-lunar world 方向轉成 earth-local（model space）
    const eg = earthSpinRef.current;
    if (eg) {
      eg.getWorldQuaternion(tmpQuatInv.current).invert();
      tmpSubLLocal.current.copy(subLunarRef.current).applyQuaternion(tmpQuatInv.current).normalize();
    } else {
      tmpSubLLocal.current.copy(subLunarRef.current).normalize();
    }
    uniforms.uSubLunar.value.copy(tmpSubLLocal.current);

    // wave-front 進度從 ripple state 取（跟 D1 同步）
    const rs = rippleStateRef.current;
    if (rs.live) {
      const t = rs.age / RIPPLE_LIFE_SEC;
      const eased = 1 - Math.pow(1 - t, 2);
      uniforms.uWaveFrontRad.value = (eased * RIPPLE_MAX_RADIUS_DEG * Math.PI) / 180;
    } else {
      uniforms.uWaveFrontRad.value = -1; // 哨兵：fragment 自己判斷不畫 wave band
    }

    uniforms.uOpacity.value = visibility;
    // 連續 wave bands + scanline 動畫驅動
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[1.022, 32, 24]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          #define PI 3.14159265359
          uniform vec3      uSubLunar;
          uniform float     uTime;
          uniform sampler2D uLandMask;
          varying vec3 vSphereNormal;
          varying vec3 vViewNormal;
          varying float vLegendre;       // P2 軸極隆起係數（fragment 用於水彩漸層）
          varying float vTideHeight;     // 總 displacement（fragment 提亮波峰）

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
            //   AMP 0.024 = 球半徑 2.4% 拉長，比球體明顯但不誇張
            float c = dot(sphereN, uSubLunar);
            float legendre = (3.0 * c * c - 1.0) * 0.5;
            vLegendre = legendre;
            float ellipsoid = legendre * 0.024;

            // ─── 輕量同心波 height：海面波峰高度（保留立體感） ────
            //    fragment 不再畫 multi-band 紋路，但 vertex 保留波峰
            float angDist = acos(clamp(c, -1.0, 1.0));
            float bandPhase = angDist * 16.0 - uTime * 1.3;
            float bands = sin(bandPhase) * 0.5 + 0.5;
            bands = smoothstep(0.55, 0.95, bands);
            float bandFade = smoothstep(2.6, 0.4, angDist);
            float waveHeight = bands * bandFade * 0.010;

            float totalDisp = (ellipsoid + waveHeight) * oceanFactor;
            vTideHeight = totalDisp;

            vec3 displaced = position + sphereN * totalDisp;
            vViewNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          #define PI 3.14159265359
          uniform vec3      uAccent;
          uniform vec3      uSubLunar;
          uniform float     uWaveFrontRad;
          uniform float     uOpacity;
          uniform sampler2D uLandMask;
          varying vec3  vSphereNormal;
          varying vec3  vViewNormal;
          varying float vLegendre;     // P2 軸極隆起（vertex 已算）
          varying float vTideHeight;

          void main() {
            // ─── Land mask 採樣 ─────────────────────────────────
            float lat = asin(clamp(vSphereNormal.y, -1.0, 1.0));
            float lng = atan(vSphereNormal.z, -vSphereNormal.x);
            vec2 maskUv = vec2((lng + PI) / (2.0 * PI), 0.5 - lat / PI);
            float landMask = texture2D(uLandMask, maskUv).r;
            float landFactor = smoothstep(0.30, 0.55, landMask);
            float oceanFactor = 1.0 - landFactor;

            // ─── 水彩色塊（取代之前 scanline + multi-band 紋路）───
            // 朝 sub-lunar 兩極（軸極隆起區）有最深色塊，赤道腰部最淡
            // 用 P2 Legendre 結果做 smoothstep，邊界柔和、無紋路
            float axisWatercolor = smoothstep(-0.2, 0.95, vLegendre) * 0.32 * oceanFactor;

            // 朝月球面 hemisphere 微亮基底（前半最亮、背面次之、赤道最淡）
            float dotSub = dot(vSphereNormal, uSubLunar);
            float facing = max(0.0, dotSub);
            float baseGlow = pow(facing, 1.5) * 0.22 * oceanFactor;
            // 反月球面也有 P2 隆起（背面潮汐），但比正面淡
            float backFacing = max(0.0, -dotSub);
            float backGlow = pow(backFacing, 2.0) * 0.13 * oceanFactor;

            // ─── Wave-front band — D1 同心圓擴散（強化版） ─────
            // 用戶看不到「波紋掃過」效果 → 強化 peak 0.85 → 1.10
            float angDist = acos(clamp(dotSub, -1.0, 1.0));
            float waveBand = 0.0;
            if (uWaveFrontRad > 0.0) {
              float distFromFront = abs(angDist - uWaveFrontRad);
              float bandWidth = 0.32;
              waveBand = max(0.0, 1.0 - distFromFront / bandWidth);
              waveBand = pow(waveBand, 1.10) * 1.10 * oceanFactor;
            }

            // ─── Rim fresnel — 球緣海洋輪廓 ──────────────────────
            float fresnel = pow(1.0 - max(0.0, vViewNormal.z), 2.5);
            float rim = fresnel * 0.18 * oceanFactor;

            // ─── Tide-peak 提亮 — vertex 高處 fragment 微亮 ──────
            float peakBoost = clamp(vTideHeight * 28.0, 0.0, 1.0) * 0.22 * oceanFactor;

            // ─── 合成 ─────────────────────────────────────────
            // 水彩色塊在最底（柔軟 base），上面疊：基底 glow、波紋擴散、rim、peak
            float intensity = axisWatercolor + baseGlow + backGlow + waveBand + rim + peakBoost;
            vec3 col = uAccent * intensity;
            // 波紋掃過時加白光點綴（讓 wave-front 在水彩 base 上更顯眼）
            col += vec3(1.0, 1.0, 0.92) * (waveBand * 0.28 + peakBoost * 0.30);

            float a = clamp(intensity * uOpacity, 0.0, 0.72);
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
  // 共享 ripple state（D1 LineSegments、ocean shell、terrain shader 都讀同一份）
  const rippleStateRef = useRef<RippleState>({
    age: 0, live: false,
    originX: 0, originY: 1, originZ: 0,
    nextSpawnAt: 0.5,
  });

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

  // 互動
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartRotYRef = useRef(0);
  const springBackTargetRef = useRef<number | null>(null);

  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (!isDraggingRef.current) return;
      const eg = earthSpinRef.current;
      if (!eg) return;
      const dx = e.clientX - dragStartXRef.current;
      if (Math.abs(dx) > 4) didDragRef.current = true;
      if (didDragRef.current) {
        eg.rotation.y = dragStartRotYRef.current + (dx / 800) * Math.PI * 2;
      }
    }
    function handleUp() {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      if (didDragRef.current) {
        springBackTargetRef.current = dragStartRotYRef.current;
      } else {
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
    window.addEventListener("pointermove", handleMove);
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
      // pointermove 寫入
    } else if (springBackTargetRef.current !== null) {
      const tgt = springBackTargetRef.current;
      const dist = tgt - eg.rotation.y;
      if (Math.abs(dist) < 0.003) {
        eg.rotation.y = tgt;
        springBackTargetRef.current = null;
      } else {
        eg.rotation.y += dist * 0.08;
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

            {/* Layer 6: 同心圓潮汐 D1 + 台灣海岸線脈動 D2 */}
            <TideRipples
              accentColor={accentColor}
              subLunarRef={subLunarRef}
              earthSpinRef={earthSpinRef}
              taiwanGeom={coastlines?.taiwan ?? null}
              taiwanUnitVecs={coastlines?.taiwanUnitVecs ?? null}
              stateRef={rippleStateRef}
            />

            {/* Layer 6b: 海洋 ambient 薄膜（shader-only，每幀只更新 3 個 uniform）
                朝月球面有基底亮度、wave-front 經過時亮環擴散、球緣有 fresnel 提亮
                uLandMask 採樣：陸地處 wave/glow 全部 fade，不蓋過海岸線 */}
            <MobileOceanShell
              accentColor={accentColor}
              subLunarRef={subLunarRef}
              earthSpinRef={earthSpinRef}
              rippleStateRef={rippleStateRef}
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

            {/* 互動球殼 */}
            <mesh
              frustumCulled={false}
              onPointerDown={(e) => {
                isDraggingRef.current = true;
                didDragRef.current = false;
                dragStartXRef.current = e.nativeEvent.clientX;
                dragStartRotYRef.current = earthSpinRef.current?.rotation.y ?? 0;
                snapTargetYRef.current = null;
                springBackTargetRef.current = null;
                e.stopPropagation();
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
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <Canvas
        camera={{ fov: 50, near: 0.01, far: 1000, position: [0, 0, 4.6] }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
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
