"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// 蟲洞剖面：長頸 + 兩端 flat disc 喇叭口
//   funnel section：power curve（喉嚨保持細，靠近端再快速展開到 mouthInnerR）
//   disc section：在 y=±halfH 平面上由 mouthInnerR 延伸到 mouthOuterR（同 y、不同 r → 平面碟形）
// 這結構讓最外端真的是「平面圓盤」而非繼續彎曲的曲面，吻合 Einstein-Rosen bridge 數學模型
export const WORMHOLE_HALF_H = 1.0; // 給 char ring 同步使用

function buildWormholePoints(): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const FUNNEL_SEG = 13;             // funnel 兩側各 13 段（共 26）
  const throatR    = 0.18;           // 喉嚨保持纖細
  const mouthInner = 0.58;           // 喇叭口內緣（funnel 頂端）
  const mouthOuter = 0.95;           // 喇叭口外緣（disc 外側）
  const halfH      = WORMHOLE_HALF_H;
  const N          = 2.5;            // funnel 曲線指數高 → 喉嚨段保持細，靠近端急展開

  // ── 底端 disc：外緣 → 內緣（兩個點，y 都在 -halfH，r 變化 → 平面）
  points.push(new THREE.Vector2(mouthOuter, -halfH));
  points.push(new THREE.Vector2(mouthInner, -halfH));

  // ── 底部 funnel：從內緣（mouthInner, -halfH）平滑延伸到喉嚨（throatR, 0）
  // i=1 起跳避免重複上一個點
  for (let i = 1; i <= FUNNEL_SEG; i++) {
    const k = i / FUNNEL_SEG;
    const y = -halfH + halfH * k;
    const ay = 1 - k;
    const r = throatR + (mouthInner - throatR) * Math.pow(ay, N);
    points.push(new THREE.Vector2(r, y));
  }

  // ── 頂部 funnel：從喉嚨（throatR, 0）平滑延伸到內緣（mouthInner, halfH）
  // i=1 起跳避免重複喉嚨點
  for (let i = 1; i <= FUNNEL_SEG; i++) {
    const k = i / FUNNEL_SEG;
    const y = halfH * k;
    const ay = k;
    const r = throatR + (mouthInner - throatR) * Math.pow(ay, N);
    points.push(new THREE.Vector2(r, y));
  }

  // ── 頂端 disc：內緣 → 外緣（y=halfH 不變、r 變化）
  // 跳過內緣（已存）只加外緣
  points.push(new THREE.Vector2(mouthOuter, halfH));

  return points;
}

// 在 lathe 曲面上隨機灑星點
function buildStarPositions(points: THREE.Vector2[], count = 42): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // 隨機取剖面上某個點 + 隨機角度繞 Y
    const seg = points[Math.floor(Math.random() * points.length)];
    const theta = Math.random() * Math.PI * 2;
    arr[i * 3]     = seg.x * Math.cos(theta);
    arr[i * 3 + 1] = seg.y;
    arr[i * 3 + 2] = seg.x * Math.sin(theta);
  }
  return arr;
}

function readAccentColor(): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color("#00e5cc");
  const val = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return new THREE.Color(val || "#00e5cc");
}

// 靜態 tilt 值（CSS char ring 也用同一組對齊蟲洞中軸）
export const WORMHOLE_TILT = {
  x: 0.12,    // ≈ 7° forward
  z: -0.26,   // ≈ -15° left lean
} as const;

function WormholeInner({ active }: { active: boolean }) {
  // 兩個 group：tiltGroup 套靜態 tilt（一次性），spinGroup 只做 Y 軸自轉
  // → 自轉發生在 spinGroup 自己的 local Y（即蟲洞 tilt 後的中軸）
  // → 視覺上是「沿著傾斜的中軸同心圓自轉」，不會再有兩軸擺動
  const tiltGroupRef = useRef<THREE.Group>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [accent, setAccent] = useState<THREE.Color>(() => readAccentColor());

  // 監聽主題變化 → 同步 material 色
  useEffect(() => {
    const obs = new MutationObserver(() => setAccent(readAccentColor()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => obs.disconnect();
  }, []);

  const points = useMemo(buildWormholePoints, []);
  // lathe 環向分段 36 → 18（半密度）→ 經度線數量減半，視覺更輕
  const latheGeom = useMemo(
    () => new THREE.LatheGeometry(points, 18),
    [points],
  );
  const wireGeom = useMemo(
    () => new THREE.WireframeGeometry(latheGeom),
    [latheGeom],
  );

  // 星點用顯式 geometry 建構（避免 bufferAttribute JSX 在不同 R3F 版本的歧義）
  const starGeom = useMemo(() => {
    const positions = buildStarPositions(points, 40);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [points]);

  useEffect(() => {
    // 3/4 視角：camera 上抬 + 側偏
    camera.position.set(1.55, 0.95, 2.55);
    camera.lookAt(0, 0, 0);

    // tiltGroup 一次性套靜態 tilt（不會在每幀重設）
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.set(WORMHOLE_TILT.x, 0, WORMHOLE_TILT.z);
    }
  }, [camera]);

  useFrame((_, dt) => {
    // 只動 spinGroup 的 Y 軸 → 純粹繞蟲洞自身中軸自轉，無擺動
    const sg = spinGroupRef.current;
    if (!sg) return;
    const speed = active ? 0.7 : 0.26;
    sg.rotation.y += dt * speed;
  });

  return (
    <group ref={tiltGroupRef}>
      {/* spinGroup：純 Y 軸自轉，繞蟲洞自身中軸 */}
      <group ref={spinGroupRef}>
        {/* 網格線框 — 主視覺 */}
        <lineSegments geometry={wireGeom}>
          <lineBasicMaterial color={accent} transparent opacity={active ? 0.9 : 0.6} />
        </lineSegments>

        {/* 半透明填充 — 給網格一點「面」的感覺 */}
        <mesh geometry={latheGeom}>
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={active ? 0.08 : 0.04}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* 曲面上的星點 */}
        <points geometry={starGeom}>
          <pointsMaterial
            color="#ffffff"
            size={0.03}
            transparent
            opacity={active ? 0.95 : 0.8}
            sizeAttenuation
          />
        </points>

        {/* 喉嚨中央發光小球 */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshBasicMaterial color={accent} transparent opacity={active ? 0.9 : 0.7} />
        </mesh>
      </group>
    </group>
  );
}

export function WormholeR3F({ active }: { active: boolean }) {
  return (
    // pointer-events: none → 讓滑鼠事件穿透 Canvas，傳到外層 <button>
    // 否則 R3F 預設 attach raycaster 監聽會攔截 hover/click，按鈕互動失效
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <Canvas
        camera={{ fov: 46, near: 0.01, far: 100, position: [1.55, 0.95, 2.55] }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent", pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <WormholeInner active={active} />
      </Canvas>
    </div>
  );
}
