"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildMoonPoints, recolorMoonPoints } from "./buildMoonPoints";
import { useAppStore } from "@/store/useAppStore";
import { useJawMoonStore } from "@/store/useJawMoonStore";
import { useGazeController } from "@/hooks/useGazeController";

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
const _camPos        = new THREE.Vector3();

// ─── 拖曳放大：讓月球在 grabbed 期間「視覺尺寸」永遠等於軌道最近點時的尺寸 ──
// 軌道最近點 = 月球公轉到攝影機正前方時 → world distance ≈ |camera.z - MOON_ORBIT_RADIUS|
// 透視投影：apparent size ∝ 1 / distance；要在任意距離 d 維持「最近點 apparent size」
// → 補償縮放 = d / minDist。grabbed/returning 時即時計算。
const MOON_FRONT_DIST_HINT = 2.0; // 攝影機 z=4、軌道 r=2 → 最近點距離 ≈ 2，初始 fallback

// ─── Props ───────────────────────────────────────────────────────────────────
interface MoonProps {
  accentColor: THREE.Color;
  /** 0 = 隱藏，1 = 完整顯示（boot 期間 fade in） */
  visibility?: number;
  /** 點雲密度（0~1），1 = 完整 22k candidates，0.7 = 砍 30%（reduced tier 用） */
  pointDensity?: number;
}

const MOON_BASE_CANDIDATES = 22000;

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
  { accentColor, visibility = 1, pointDensity = 1 },
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

  // 月球↔眼球凝視控制器（跨桌機/手機共用）
  const gaze = useGazeController();
  // 把 moon screen NDC 轉成 pointer NDC 給 gaze.update 用（避免 alloc）
  const pointerNDCForGazeRef = useRef(new THREE.Vector2(0, 0));
  const moonPointsBaseMatRef = useRef<THREE.PointsMaterial>(null);

  // ─── 月球點雲幾何（只 build 一次，主題切換改走 recolorMoonPoints） ────────
  // 改動前：grabbed 每 1.5s cycleTheme → buildMoonPoints (22k candidates) ≈ 30-60ms 卡頓
  // 改動後：useMemo 只跑一次，主題切換時下方 useEffect 重算 colors ≈ 1ms
  // pointDensity：依 GlobeScene 的 tier 縮放 candidate count（reduced 走 0.7 = 砍 30%）
  const moonPointsGeom = useMemo(
    () => buildMoonPoints({
      moonRadius: MOON_RADIUS,
      accentColor,
      candidateCount: Math.round(MOON_BASE_CANDIDATES * pointDensity),
    }),
    // 故意不依賴 accentColor：position 是固定的，只有 colors 跟著變
    // accentColor 變動由下方 recolorMoonPoints effect 處理
    // pointDensity 也不放 dep：mount 時就決定了，跟著 tier 走，過程中不會變
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // 主題切換 → recolor 不重建
  useEffect(() => {
    recolorMoonPoints(moonPointsGeom, accentColor);
  }, [accentColor, moonPointsGeom]);

  // ─── 粒子化眼球 overlay ───────────────────────────────────────
  // 眼球不使用球面遮罩或 GLB；直接用同一份月球點雲疊一層 view-facing point shader。
  // 中心黑洞、低彩度虹膜與血絲都由粒子點聚集出來，避免像模糊像素遮罩。
  const eyeParticleUniforms = useMemo(
    () => ({
      uOpacity: { value: visibility },
      uMorph:   { value: 0 },
      uGazeDir: { value: new THREE.Vector2(0, 0) },
      uBlink:   { value: 0 },
      uTime:    { value: 0 },
      uAccent:  { value: accentColor.clone() },
      // Mitosis cycle 0..1：JS 端控制（grabbed 起跳時 reset，只在 morph > 0.05 推進）
      // 0.10–0.25 開為 2、0.40–0.55 開為 4、0.70–0.85 收回 2、0.85–1.00 收回 1
      uMitosisCycle: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Mitosis 計時器：跟手機版同邏輯 — morph 從 0 → 顯著時 reset，cycle 4s 一輪
  const mitosisTimeRef = useRef(0);
  const prevMorphRef = useRef(0);

  useEffect(() => {
    eyeParticleUniforms.uAccent.value.copy(accentColor);
  }, [accentColor, eyeParticleUniforms]);

  const eyeParticleMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: eyeParticleUniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      vertexShader: /* glsl */ `
        uniform float uMorph;
        uniform float uBlink;
        uniform float uTime;
        uniform vec2 uGazeDir;
        attribute vec3 color;
        varying vec3 vBaseColor;
        varying vec3 vViewNormal;
        varying float vDepthShade;
        varying float vCenterMask;   // 中心區（pupil+iris）vs 邊緣區，給 fragment 增 alpha

        void main() {
          vec3 unitPos = normalize(position);
          float jx = sin(uTime * 17.0 + position.x * 43.0);
          float jy = cos(uTime * 19.0 + position.y * 37.0);
          float jz = sin(uTime * 13.0 + position.z * 41.0);
          float blinkPulse = smoothstep(0.15, 0.75, uBlink);
          float jitter = (jx * 0.45 + jy * 0.35 + jz * 0.20) * (0.0014 + blinkPulse * 0.0008) * uMorph;
          vec3 displaced = position + unitPos * jitter;
          vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
          vBaseColor = color;
          vec3 viewN = normalize(mat3(modelViewMatrix) * unitPos);
          vViewNormal = viewN;
          vDepthShade = 0.58 + clamp(viewN.z * 0.5 + 0.5, 0.0, 1.0) * 0.42;

          // ── 視覺密度重分配：中心粒子放大、外圍縮小 ──
          // 不增加粒子總數的前提下，讓 pupil/iris 區的點放大 → 視覺上更密更實
          vec3 gazeAxis = normalize(vec3(uGazeDir.x * 0.48, uGazeDir.y * 0.48, 1.0));
          float gazeAngle = acos(clamp(dot(viewN, gazeAxis), -1.0, 1.0));
          // pupilZone: gazeAngle < 0.30 → 1.0；> 0.45 → 0.0
          float pupilZone = 1.0 - smoothstep(0.10, 0.30, gazeAngle);
          // irisZone:   gazeAngle 0.20–0.55 → 1.0；外圍快速降
          float irisZone  = (1.0 - smoothstep(0.46, 0.68, gazeAngle)) * smoothstep(0.16, 0.32, gazeAngle);
          float centerMask = clamp(pupilZone + irisZone * 0.8, 0.0, 1.0);
          vCenterMask = centerMask;

          // 點大小：中心區放大 1.9x、邊緣 1.0x；morph 漸進混合
          float baseSize = mix(1.35, 2.35, uMorph);
          float centerBoost = 1.0 + centerMask * 0.95 * uMorph;
          gl_PointSize = baseSize * centerBoost;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uMorph;
        uniform float uBlink;
        uniform float uTime;
        uniform vec3 uAccent;
        uniform vec2 uGazeDir;
        uniform float uMitosisCycle;
        varying vec3 vBaseColor;
        varying vec3 vViewNormal;
        varying float vDepthShade;
        varying float vCenterMask;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // 2D value noise（用於 domain warping）
        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // Inigo Quilez polynomial smin：兩 SDF 邊界平滑融合
        float smin(float a, float b, float k) {
          float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
          return mix(b, a, h) - k * h * (1.0 - h);
        }

        // 立方 ease-in / ease-out：開頭慢→結尾快（細胞分裂的彈開感）
        float easeIn(float a, float b, float t) {
          float x = clamp((t - a) / (b - a), 0.0, 1.0);
          return x * x * x;
        }
        float easeOut(float a, float b, float t) {
          float x = clamp((t - a) / (b - a), 0.0, 1.0);
          return 1.0 - pow(1.0 - x, 3.0);
        }

        void main() {
          vec2 pointUv = gl_PointCoord - vec2(0.5);
          float pointDist = length(pointUv);
          if (pointDist > 0.5) discard;
          float pointAlpha = 1.0 - smoothstep(0.34, 0.5, pointDist);

          vec3 n = normalize(vViewNormal);
          float frontMask = smoothstep(-0.10, 0.24, n.z);
          if (frontMask <= 0.001 || uMorph <= 0.001) discard;

          // ── Mitosis：每 cell 有自己的 gaze axis，整顆「黑眼球」（iris+pupil）做一個整體分裂 ──
          // 1→2→3→2→1（max 3 cells），8 秒一輪、ease-in 分裂、ease-out 合回
          float cycle = uMitosisCycle;
          float twoSep = easeIn(0.05, 0.30, cycle) - easeOut(0.82, 1.00, cycle);
          float threeSep = easeIn(0.38, 0.55, cycle) - easeOut(0.62, 0.82, cycle);

          // SPACING 在 uGazeDir-space → n.xy 偏移 = SPACING × 0.48
          // 0.20 → 0.32：n.xy 偏移從 0.096 → 0.154（約 9° 角偏移），分裂視覺更明顯
          float SPACING = 0.32;
          vec2 c0_off = vec2(-SPACING * twoSep, 0.0);
          vec2 c1_off = vec2( SPACING * twoSep, -SPACING * 0.40 * threeSep);
          vec2 c2_off = vec2( SPACING * twoSep,  SPACING * 0.40 * threeSep);

          // 中間分裂部分慢速旋轉 ±0.15 rad ≈ ±8.6°（驚悚感）
          float rotAngle = sin(uTime * 0.25) * 0.15;
          float ca = cos(rotAngle), sa = sin(rotAngle);
          mat2 rot = mat2(ca, -sa, sa, ca);
          c0_off = rot * c0_off;
          c1_off = rot * c1_off;
          c2_off = rot * c2_off;

          // 每 cell 微浮動
          vec2 j0 = vec2(vnoise(vec2(uTime * 0.5, 0.0)) - 0.5, vnoise(vec2(0.0, uTime * 0.5)) - 0.5) * 0.012;
          vec2 j1 = vec2(vnoise(vec2(uTime * 0.5, 2.3)) - 0.5, vnoise(vec2(2.3, uTime * 0.5)) - 0.5) * 0.012;
          vec2 j2 = vec2(vnoise(vec2(uTime * 0.5, 4.6)) - 0.5, vnoise(vec2(4.6, uTime * 0.5)) - 0.5) * 0.012;
          c0_off += j0; c1_off += j1; c2_off += j2;

          // 每 cell 的 effective gaze axis
          vec3 ga0 = normalize(vec3((uGazeDir + c0_off) * 0.48, 1.0));
          vec3 ga1 = normalize(vec3((uGazeDir + c1_off) * 0.48, 1.0));
          vec3 ga2 = normalize(vec3((uGazeDir + c2_off) * 0.48, 1.0));

          // 每 cell 的 gazeAngle（geodesic）
          float gAngle0 = acos(clamp(dot(n, ga0), -1.0, 1.0));
          float gAngle1 = acos(clamp(dot(n, ga1), -1.0, 1.0));
          float gAngle2 = acos(clamp(dot(n, ga2), -1.0, 1.0));

          // smin 融合 → 整體 iris/sclera 邊界（黏滯地像 polycoria）
          float gazeAngle = smin(smin(gAngle0, gAngle1, 0.05), gAngle2, 0.05);

          // 整體 iris 用 toGaze（gaze-shifted 在 fragment 內坐標，給纖維/血絲用）
          vec2 toGaze = n.xy - uGazeDir * 0.48;
          vec2 eyeCoord = n.xy - uGazeDir * 0.18;

          // 自然脈動 ±5%
          float pulse = 1.0 + 0.05 * sin(uTime * 0.5);

          // 每 cell 自己的 pupil（黑核）— 放大：coreR 0.16 → 0.20，falloffR 0.28 → 0.32
          // 解剖學：瞳孔在正常光線下 1/4–1/3 於虹膜，這裡放在較大端讓視覺明顯
          float coreR = 0.20 * pulse;
          float pp0 = 1.0 - smoothstep(coreR * 0.7, coreR, gAngle0);
          float pp1 = 1.0 - smoothstep(coreR * 0.7, coreR, gAngle1);
          float pp2 = 1.0 - smoothstep(coreR * 0.7, coreR, gAngle2);
          float pupilCore = max(pp0, max(pp1, pp2));

          // 每 cell 自己的 pupilFalloff（黑→暗 iris 過渡）
          float falloffR = 0.32 * pulse;
          float pf0 = 1.0 - smoothstep(coreR, falloffR, gAngle0);
          float pf1 = 1.0 - smoothstep(coreR, falloffR, gAngle1);
          float pf2 = 1.0 - smoothstep(coreR, falloffR, gAngle2);
          float pupilFalloff = max(pf0, max(pf1, pf2));

          // Iris/sclera 用 smin-merged gazeAngle → 整顆「黑眼球」邊界一起分裂
          float irisOuter = 1.0 - smoothstep(0.46, 0.72, gazeAngle);
          float irisInner = smoothstep(0.20, 0.36, gazeAngle);
          float irisMask = clamp(irisOuter * irisInner, 0.0, 1.0);
          irisMask = clamp(irisMask - pupilFalloff * 0.7, 0.0, 1.0);
          float scleraMask = clamp(1.0 - irisOuter, 0.0, 1.0);

          float angle = atan(eyeCoord.y, eyeCoord.x);
          float radial = sin(angle * 9.0 + gazeAngle * 18.0 + uTime * 0.28) * 0.5 + 0.5;
          // 血絲：頻率提高、break 門檻放寬 → 更密集可見的微血管
          float veinWave = sin(angle * 13.0 + gazeAngle * 32.0 + uTime * 0.42);
          float veinBreak = hash(floor(vec2(angle * 22.0, gazeAngle * 30.0)));
          // 血絲分佈：在 sclera 內側到中段（離瞳孔近）最強，外緣弱
          float veinZone = smoothstep(0.32, 0.55, gazeAngle) * (1.0 - smoothstep(0.62, 0.86, gazeAngle));
          float vein = smoothstep(0.78, 0.96, veinWave * 0.5 + 0.5) * veinZone;
          vein *= step(0.22, veinBreak); // 0.35 → 0.22，更多血絲不被打斷

          vec3 scleraCol = mix(vec3(0.68, 0.74, 0.66), uAccent * 0.24, 0.28) * vDepthShade;
          // 血絲色更紅更明顯（0.36→0.55、係數 0.58→0.85）
          scleraCol += vec3(0.55, 0.04, 0.06) * vein * 0.85;

          // 虹膜：飽和度大幅提高，accent 主導不再被混暗成幾乎黑
          // 原本 mix(accent×0.28..., dark, 0.48) → 改成 accent×0.65 為基底，少量混暗保留陰影感
          vec3 irisBase = uAccent * (0.65 + radial * 0.22);
          irisBase = mix(irisBase, vec3(0.04, 0.02, 0.06), 0.20);
          // 虹膜放射條紋更明顯：用 angular 分區做亮暗 stripe
          float irisStripe = sin(angle * 24.0) * 0.5 + 0.5;
          vec3 irisCol = irisBase * (0.88 + irisStripe * 0.18);

          // 瞳孔：純黑（移除原本 vec3(0,0,0.012) 微藍偏移）
          vec3 pupilCol = vec3(0.0);

          vec3 eyeCol = vBaseColor * 0.45;
          eyeCol = mix(eyeCol, scleraCol, scleraMask);
          eyeCol = mix(eyeCol, irisCol, irisMask);
          eyeCol = mix(eyeCol, pupilCol, pupilFalloff);
          eyeCol = mix(eyeCol, vec3(0.0), pupilCore);

          float rimDepth = pow(1.0 - max(0.0, n.z), 2.2);
          eyeCol += uAccent * rimDepth * 0.08 * (1.0 - pupilCore);

          float lidOpen = mix(0.92, 0.055, uBlink);
          float lidVisible = 1.0 - smoothstep(lidOpen, lidOpen + 0.075, abs(eyeCoord.y));
          eyeCol = mix(vec3(0.0, 0.005, 0.008), eyeCol, lidVisible);

          // ── Alpha 重分配：中心區（pupil+iris）拉到接近全不透明、sclera 維持半透 ──
          // pupilCore alpha 1.0、irisMask alpha ~0.96、scleraMask 0.42（之前 0.58）
          // 加上 vCenterMask（vertex 算的視覺中心 zone）再 boost +30%
          float cluster = max(pupilCore * 1.0,
                              max(irisMask * 0.96,
                                  max(vein * 0.85, scleraMask * 0.42)));
          cluster *= 1.0 + vCenterMask * 0.30;
          cluster = clamp(cluster, 0.0, 1.0);
          float alpha = uOpacity * uMorph * frontMask * pointAlpha * cluster * (0.24 + lidVisible * 0.76);
          gl_FragColor = vec4(eyeCol, alpha);
        }
      `,
    });
    return mat;
  }, [eyeParticleUniforms]);

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
  // 視覺放大：grabbed 時補償透視縮放 + 顫動；orbiting 時 = 1
  const visualScaleRef     = useRef(1);
  // 軌道最近點（攝影機到軌道的最短距離）— mount 時用 camera.z 推算，之後不變
  const minOrbitDistRef    = useRef(MOON_FRONT_DIST_HINT);
  // 補償強度（0 = 完全自然透視、1 = 補償到軌道最近點 apparent size）
  // grabbed 立刻拉到 1；returning 平滑回到 0；orbiting = 0
  const compensationRef    = useRef(0);

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

    // 軌道最近點距離：軌道是半徑 MOON_ORBIT_RADIUS 的圓，圓心在 origin。
    // 攝影機在 origin 的距離 = |camPos|；軌道最近點到攝影機 = |camPos| - MOON_ORBIT_RADIUS
    // （這才是月球公轉中視覺最大時的距離；之前用 (2,0,0) world 位置算錯成 4.47）
    camera.getWorldPosition(_camPos);
    const camToOrigin = _camPos.length();
    const minOrbitDist = Math.max(0.1, camToOrigin - MOON_ORBIT_RADIUS);
    minOrbitDistRef.current = minOrbitDist;

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

    // ── 視覺放大：grabbed/returning 時補償透視，讓月球 apparent size = 軌道最近點 ──
    //   compensationRef：1 = 完整補償到「軌道最近點 apparent size」（拖曳態最大值）
    //                    0 = 完全自然透視（軌道態）
    //   grabbed → 快速拉到 1（fast lerp 24/s）
    //   returning → 平滑回到 0（slow lerp 3.8/s，與 position spring 4.5/s 同步）
    //   orbiting → 0
    moon.getWorldPosition(_moonWorldPos);
    const currentDist = _moonWorldPos.distanceTo(_camPos);
    const compTarget = state === "grabbed" ? 1 : 0;
    const compSpeed = state === "grabbed" ? 24 : 3.8;
    compensationRef.current = THREE.MathUtils.lerp(
      compensationRef.current, compTarget, 1 - Math.exp(-dt * compSpeed),
    );
    // 自然 scale = 1；最大 scale = currentDist / minOrbitDist
    // 用 compensationRef 在兩者之間 lerp → 從拖曳最大尺寸 → 自然透視 一條線平滑過渡
    const compensatedScale = currentDist / minOrbitDistRef.current;
    const targetScale = THREE.MathUtils.lerp(1, compensatedScale, compensationRef.current);
    // 顫動 wobble：只在 morph 顯著時生效，幅度保持很小，避免整顆點雲暴衝成色塊。
    const morphAmt = THREE.MathUtils.clamp(gaze.morph.current, 0, 1);
    const wobble = morphAmt > 0.05
      ? (Math.sin(elapsed * 31.0) * 0.004 + Math.cos(elapsed * 23.0 + 1.3) * 0.003) * morphAmt
      : 0;
    // 視覺 scale 用快速跟隨 target，避免兩層阻尼 lerp 疊加造成「卡頓後才縮回」
    const sk = 1 - Math.exp(-dt * (state === "grabbed" ? 28 : 12));
    visualScaleRef.current = THREE.MathUtils.lerp(visualScaleRef.current, targetScale, sk);
    const finalScale = Math.max(0.05, visualScaleRef.current + wobble);
    moon.scale.setScalar(finalScale);

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
      // 降低散逸密度：保留顫動與能量漏出，但不讓外圈點雲蓋掉完整眼球輪廓。
      const SPAWN_INTERVAL = 1 / 28;
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

    // ── Gaze controller：morph + saccade + 顫動 ──
    // pointer NDC 用 pointerNDCRef（拖曳偵測也用同一份）；orbiting 時就讓眼球隨機掃視
    pointerNDCForGazeRef.current.set(pointerNDCRef.current.x, pointerNDCRef.current.y);
    gaze.setMoonState(state);
    gaze.update(dt, pointerNDCForGazeRef.current);
    const morphClamped = THREE.MathUtils.clamp(gaze.morph.current, 0, 1);

    if (moonPointsBaseMatRef.current) {
      moonPointsBaseMatRef.current.opacity = visibility * THREE.MathUtils.lerp(1, 0.62, morphClamped);
      moonPointsBaseMatRef.current.size = THREE.MathUtils.lerp(0.008, 0.0065, morphClamped);
    }

    eyeParticleUniforms.uOpacity.value = visibility;
    eyeParticleUniforms.uMorph.value = morphClamped;
    eyeParticleUniforms.uGazeDir.value.copy(gaze.gazeDir);
    eyeParticleUniforms.uBlink.value = THREE.MathUtils.clamp(gaze.blink.current, 0, 1);
    eyeParticleUniforms.uTime.value = elapsed;

    // ── Mitosis cycle：跟手機版同邏輯 ──
    // morph 邊緣（< 0.05 → ≥ 0.05）reset 到 0；只在 morph > 0.05 時推進
    // → 使用者每次抓月球都從 cycle 起點看到完整 1→2→4→2→1
    if (prevMorphRef.current < 0.05 && morphClamped >= 0.05) {
      mitosisTimeRef.current = 0;
    }
    if (morphClamped > 0.05) {
      mitosisTimeRef.current += dt;
    }
    prevMorphRef.current = morphClamped;
    // 8 秒一輪：用戶要求分裂速度較慢
    eyeParticleUniforms.uMitosisCycle.value = (mitosisTimeRef.current % 8.0) / 8.0;
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
              ref={moonPointsBaseMatRef}
              vertexColors
              size={0.008}
              sizeAttenuation
              transparent
              opacity={visibility}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>

          {/* 粒子化眼球 overlay：跟原月球共用點雲，只用 shader 改色與聚集。 */}
          <points geometry={moonPointsGeom} frustumCulled={false} renderOrder={4}>
            <primitive object={eyeParticleMaterial} attach="material" />
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

              compensationRef.current = 1;
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
          size={0.01}
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
