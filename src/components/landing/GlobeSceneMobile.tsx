"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { latLngToVec3 } from "./globe/geoUtils";

// ─── 共用常數（與桌面版對齊：保證視覺敘事一致性） ────────────────
const EARTH_AXIAL_TILT_RAD = (23.5 * Math.PI) / 180;
const TAIWAN_POS = latLngToVec3(23.8, 121.0, 1.018);
const SPIN_SPEED = 0.002; // 與桌面版相同自轉速度

// 30 個世界主要陸地座標（手寫，免 GeoJSON fetch；勾勒大致輪廓即可）
// lat, lng, intensity（0~1，影響亮度，山區/重要城市較亮）
const CITY_POINTS: ReadonlyArray<readonly [number, number, number]> = [
  [40.7, -74.0, 1.0],   // 紐約
  [34.0, -118.2, 0.8],  // 洛杉磯
  [-23.5, -46.6, 0.7],  // 聖保羅
  [-34.6, -58.4, 0.6],  // 布宜諾斯艾利斯
  [55.7, 37.6, 0.9],    // 莫斯科
  [51.5, -0.1, 1.0],    // 倫敦
  [48.8, 2.3, 0.8],     // 巴黎
  [52.5, 13.4, 0.7],    // 柏林
  [41.9, 12.5, 0.7],    // 羅馬
  [40.4, -3.7, 0.7],    // 馬德里
  [30.0, 31.2, 0.7],    // 開羅
  [-1.3, 36.8, 0.5],    // 奈洛比
  [-26.2, 28.0, 0.6],   // 約翰尼斯堡
  [35.7, 51.4, 0.6],    // 德黑蘭
  [28.6, 77.2, 0.8],    // 德里
  [19.1, 72.9, 0.8],    // 孟買
  [22.5, 88.4, 0.7],    // 加爾各答
  [13.7, 100.5, 0.7],   // 曼谷
  [1.4, 103.8, 0.8],    // 新加坡
  [-6.2, 106.8, 0.6],   // 雅加達
  [-33.9, 151.2, 0.8],  // 雪梨
  [-37.8, 144.9, 0.6],  // 墨爾本
  [35.7, 139.7, 1.0],   // 東京
  [37.5, 127.0, 0.8],   // 首爾
  [39.9, 116.4, 0.9],   // 北京
  [31.2, 121.5, 0.8],   // 上海
  [22.3, 114.2, 0.8],   // 香港
  [25.0, 121.5, 1.0],   // 台北（最亮，雖然另有 Taiwan pin，這裡再強調）
  [49.3, -123.1, 0.6],  // 溫哥華
  [60.2, 24.9, 0.5],    // 赫爾辛基
  [64.1, -21.9, 0.4],   // 雷克雅維克
  [19.4, -99.1, 0.7],   // 墨西哥城
  [-12.0, -77.0, 0.5],  // 利馬
  [44.4, 26.1, 0.5],    // 布加勒斯特
  [50.0, 14.4, 0.5],    // 布拉格
  [59.9, 30.3, 0.5],    // 聖彼得堡
  [-22.9, -43.2, 0.6],  // 里約
  [25.2, 55.3, 0.7],    // 杜拜
  [33.7, -84.4, 0.5],   // 亞特蘭大
  [41.0, 28.9, 0.7],    // 伊斯坦堡
] as const;

type Phase = "boot-0" | "boot-1" | "boot-2" | "boot-3" | "boot-4" | "idle";

// ─── 工具：讀 CSS variable 顏色 ──────────────────────────────────
function readAccentColor(): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color("#5fd9c0");
  const val = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return new THREE.Color(val || "#5fd9c0");
}

// ─── 經緯線 wireframe geometry ──────────────────────────────────
// 18 條經線（meridians）+ 12 條緯線（parallels）
// 用 LineSegments 一次性繪製所有線段，避免多個 draw call
function buildLatLngWireframe(radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const MERIDIAN_COUNT = 18;
  const PARALLEL_COUNT = 12;
  const SEGMENTS = 64; // 每條線分 64 段（曲線平滑度）

  // 經線：固定 longitude，從 -90 → 90 lat
  for (let m = 0; m < MERIDIAN_COUNT; m++) {
    const lng = (m / MERIDIAN_COUNT) * 360 - 180;
    for (let i = 0; i < SEGMENTS; i++) {
      const lat1 = -90 + (i / SEGMENTS) * 180;
      const lat2 = -90 + ((i + 1) / SEGMENTS) * 180;
      const p1 = latLngToVec3(lat1, lng, radius);
      const p2 = latLngToVec3(lat2, lng, radius);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }

  // 緯線：固定 latitude，從 -180 → 180 lng（極點除外）
  for (let p = 1; p < PARALLEL_COUNT; p++) {
    const lat = -90 + (p / PARALLEL_COUNT) * 180;
    for (let i = 0; i < SEGMENTS; i++) {
      const lng1 = -180 + (i / SEGMENTS) * 360;
      const lng2 = -180 + ((i + 1) / SEGMENTS) * 360;
      const p1 = latLngToVec3(lat, lng1, radius);
      const p2 = latLngToVec3(lat, lng2, radius);
      positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}

// ─── 城市光點 geometry（per-vertex color，亮度視 intensity 而定） ────
function buildCityPoints(accentColor: THREE.Color): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const aR = accentColor.r;
  const aG = accentColor.g;
  const aB = accentColor.b;

  for (const [lat, lng, intensity] of CITY_POINTS) {
    const p = latLngToVec3(lat, lng, 1.012);
    positions.push(p.x, p.y, p.z);
    // 部分點走白/金 highlight，模擬桌面版的 highlight chance
    const isHighlight = Math.random() < 0.15;
    if (isHighlight) {
      if (Math.random() < 0.5) {
        colors.push(1.0, 1.0, 1.0); // 白
      } else {
        colors.push(1.0, 0.82, 0.45); // 金
      }
    } else {
      const b = 0.5 + intensity * 0.6;
      colors.push(aR * b, aG * b, aB * b);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geom;
}

// ─── 背景星點（手機版精簡到 100 顆） ──────────────────────────────
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

// ─── 月球：low-poly icosahedron wireframe（取代桌面版 r3f 月球） ──
function MoonLite({ accentColor, visibility }: { accentColor: THREE.Color; visibility: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    // 月球公轉：每秒 ~0.3 rad
    g.rotation.y = state.clock.elapsedTime * 0.3;
    if (matRef.current) matRef.current.opacity = visibility * 0.7;
  });

  // 12 面體 wireframe（最 Y2K 的選擇）
  return (
    <group ref={groupRef}>
      <group position={[2.4, 0.4, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.27, 0]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.05} depthWrite={false} />
        </mesh>
        <lineSegments>
          <wireframeGeometry args={[new THREE.IcosahedronGeometry(0.275, 0)]} />
          <lineBasicMaterial ref={matRef} color={accentColor} transparent opacity={0.7} />
        </lineSegments>
      </group>
    </group>
  );
}

// ─── GlobeInner 主場景 ──────────────────────────────────────────
interface GlobeInnerProps {
  phase: Phase;
  skipBoot: boolean;
  dissolveProgress: number;
  accentColor: THREE.Color;
}

function GlobeInner({ phase, skipBoot, dissolveProgress, accentColor }: GlobeInnerProps) {
  const dissolveRef = useRef<THREE.Group>(null);
  const earthSpinRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const halo2Ref = useRef<THREE.Mesh>(null);
  const wireframeMatRef = useRef<THREE.LineBasicMaterial>(null);
  const cityPointsMatRef = useRef<THREE.PointsMaterial>(null);
  const { camera, clock, size } = useThree();
  const startRef = useRef<number | null>(null);
  const pauseEndRef = useRef<number>(-1);
  const snapTargetYRef = useRef<number | null>(null);

  // 拖拽狀態（手機版只保留水平拖，垂直拖砍掉降低複雜度）
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartRotYRef = useRef(0);
  const springBackTargetRef = useRef<number | null>(null);

  // 預先建構 geometry（accent 改變時重建 city points）
  const wireframeGeom = useMemo(() => buildLatLngWireframe(1.0), []);
  const cityGeom = useMemo(() => buildCityPoints(accentColor), [accentColor]);
  const starPositions = useMemo(() => buildStarPositions(), []);

  // 點擊球面外圍時也能觸發
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
        // 拖拽結束：彈回起始 Y rotation
        springBackTargetRef.current = dragStartRotYRef.current;
      } else {
        // 純點擊：snap 到台灣
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

  useFrame(() => {
    const dg = dissolveRef.current;
    const eg = earthSpinRef.current;
    if (!dg || !eg) return;

    if (startRef.current === null) {
      startRef.current = clock.elapsedTime * 1000;
    }
    const elapsed = clock.elapsedTime * 1000 - startRef.current;

    // 自轉 + 互動狀態機
    if (isDraggingRef.current) {
      // 拖拽中：rotation.y 由 pointermove 寫入
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

    // Camera 動畫（依 viewport aspect 動態決定基底距離）
    // 手機直立比例（aspect < 1），globe 容易頂到天花板，camera 拉遠
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

    // Dissolve（地球縮小平移，保持與桌面版一致的離場節奏）
    dg.position.x = 0.4 + dissolveProgress * 0.3;
    dg.position.y = dissolveProgress * 0.05;
    const scale = 1.0 * (1 - dissolveProgress * 0.2);
    dg.scale.setScalar(scale);

    // Boot fade in
    let baseOpacity = 1;
    if (!skipBoot && elapsed < 600) baseOpacity = elapsed / 600;
    if (wireframeMatRef.current) wireframeMatRef.current.opacity = baseOpacity * 0.5;
    if (cityPointsMatRef.current) cityPointsMatRef.current.opacity = baseOpacity;

    // Taiwan pin 雙環脈衝（保留與桌面版相同節奏）
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
  });

  // 月球可見度（boot-3 開始淡入）
  const moonVisibility = (() => {
    if (skipBoot) return 1;
    if (phase === "boot-0" || phase === "boot-1" || phase === "boot-2") return 0;
    if (phase === "boot-3") return 0.5;
    return 1;
  })();

  return (
    <>
      <ambientLight intensity={0.6} />

      {/* === Earth + Moon dissolve group === */}
      <group ref={dissolveRef}>
        {/* 軸傾父層 */}
        <group rotation-z={EARTH_AXIAL_TILT_RAD}>
          <group ref={earthSpinRef}>
            {/* 地球核心：半透明深色球，避免 wireframe 後面看到背景星星太亂 */}
            <mesh>
              <sphereGeometry args={[0.99, 24, 16]} />
              <meshBasicMaterial color="#0c1714" transparent opacity={0.55} depthWrite />
            </mesh>

            {/* Layer 1: 經緯線 wireframe（主結構） */}
            <lineSegments geometry={wireframeGeom}>
              <lineBasicMaterial
                ref={wireframeMatRef}
                color={accentColor}
                transparent
                opacity={0.5}
                depthWrite={false}
              />
            </lineSegments>

            {/* Layer 2: 城市光點（per-vertex color） */}
            <points geometry={cityGeom}>
              <pointsMaterial
                ref={cityPointsMatRef}
                vertexColors
                size={0.025}
                sizeAttenuation
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </points>

            {/* Layer 3: Atmosphere shell（用簡單 wireframe sphere 取代 fresnel shader） */}
            <lineSegments>
              <wireframeGeometry args={[new THREE.SphereGeometry(1.06, 16, 12)]} />
              <lineBasicMaterial color={accentColor} transparent opacity={0.1} depthWrite={false} />
            </lineSegments>

            {/* Taiwan pin（與桌面版同三層結構） */}
            <mesh position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <sphereGeometry args={[0.012, 12, 8]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <mesh position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <ringGeometry args={[0.018, 0.022, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <mesh ref={haloRef} position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <ringGeometry args={[0.018, 0.021, 32, 1]} />
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
              <ringGeometry args={[0.018, 0.021, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* 互動球殼：點擊 snap 台灣 / 拖拽旋轉 */}
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

        {/* 月球（low-poly wireframe） */}
        <MoonLite accentColor={accentColor} visibility={moonVisibility} />
      </group>

      {/* 背景星點 */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial color="#ffffff" size={0.025} transparent opacity={0.4} sizeAttenuation />
      </points>
    </>
  );
}

// ─── 對外元件（與 GlobeScene 同 props，可直接 swap） ──────────────
interface GlobeSceneMobileProps {
  phase: Phase;
  skipBoot: boolean;
  dissolveProgress: number;
  style?: React.CSSProperties;
}

export function GlobeSceneMobile({ phase, skipBoot, dissolveProgress, style }: GlobeSceneMobileProps) {
  const [accentColor, setAccentColor] = useState<THREE.Color>(() => readAccentColor());

  // 主題切換時更新色彩
  useEffect(() => {
    const sync = () => setAccentColor(readAccentColor());
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => obs.disconnect();
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
        />
      </Canvas>
    </div>
  );
}
