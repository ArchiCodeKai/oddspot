"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Moon } from "./globe/Moon";
import { latLngToVec3, type GeoJSONFeatureCollection } from "./globe/geoUtils";
import { buildHeightmap } from "./globe/buildDisplacedSphere";
import { buildLandPoints, recolorLandPoints } from "./globe/buildLandPoints";
import { buildOceanPoints } from "./globe/buildOceanPoints";
import { AtmosphereShell } from "./globe/AtmosphereShell";
import { OceanTideGlow } from "./globe/OceanTideGlow";
// GravityField 已停用（user feedback：那條 moon-to-earth beam 不是想要的視覺）
// import { GravityField } from "./globe/GravityField";
import { getGlowPointTexture } from "./globe/glowPointTexture";
import { TideRippleField, type TideRippleFieldHandle } from "./globe/TideRippleField";
import { OceanTideMembrane } from "./globe/OceanTideMembrane";

// 地球軸傾（真實 23.5° vs 黃道）
const EARTH_AXIAL_TILT_RAD = (23.5 * Math.PI) / 180;

// Taiwan pin 位置（地球表面略外推，避免被 land points 蓋住）
const TAIWAN_POS = latLngToVec3(23.8, 121.0, 1.025);

function readAccentColor(): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color("#5fd9c0");
  const val = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  return new THREE.Color(val || "#5fd9c0");
}

function readBgDeepColor(): THREE.Color {
  if (typeof window === "undefined") return new THREE.Color("#0c1714");
  const val = getComputedStyle(document.documentElement).getPropertyValue("--bg-deep").trim();
  return new THREE.Color(val || "#0c1714");
}

type Phase = "boot-0" | "boot-1" | "boot-2" | "boot-3" | "boot-4" | "idle";

interface GlobeInnerProps {
  phase: Phase;
  skipBoot: boolean;
  dissolveProgress: number;
  // 由外層 fetch 後傳入
  landGeom: THREE.BufferGeometry | null;
  oceanGeom: THREE.BufferGeometry | null;
  oceanCoreColor: THREE.Color;
  accentColor: THREE.Color;
  /** 256×128 land-mask DataTexture，給 OceanTideMembrane shader 用 */
  landMaskTex: THREE.DataTexture | null;
}

function GlobeInner({
  phase,
  skipBoot,
  dissolveProgress,
  landGeom,
  oceanGeom,
  oceanCoreColor,
  accentColor,
  landMaskTex,
}: GlobeInnerProps) {
  const dissolveRef = useRef<THREE.Group>(null);
  const earthSpinRef = useRef<THREE.Group>(null);
  const moonGroupRef = useRef<THREE.Group>(null);
  const rippleFieldRef = useRef<TideRippleFieldHandle | null>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const halo2Ref = useRef<THREE.Mesh>(null);
  const oceanCoreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const landMatRef = useRef<THREE.PointsMaterial>(null);
  const { camera, clock } = useThree();
  const startRef = useRef<number | null>(null);
  // 點擊地球 → 平滑旋轉對正台灣，暫停 5 秒後繼續
  const pauseEndRef = useRef<number>(-1);
  // null = 不在 snap 中；有值 = 正在插值到這個 Y rotation
  const snapTargetYRef = useRef<number | null>(null);

  // ─── 拖拽旋轉（全軸：X = 垂直拖拽，Y = 水平拖拽） ────────────
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);          // 是否已超過拖拽門檻（4px）
  const dragStartXRef = useRef(0);           // 拖拽起始 pointer clientX
  const dragStartYRef = useRef(0);           // 拖拽起始 pointer clientY
  const dragStartRotYRef = useRef(0);        // 拖拽起始 rotation.y
  const dragStartRotXRef = useRef(0);        // 拖拽起始 rotation.x
  // 放開後彈回到此 {x, y}；null = 不在彈回狀態
  const springBackTargetRef = useRef<{ x: number; y: number } | null>(null);

  // 背景星點
  const starPositions = useMemo(() => {
    const arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      const r = 8 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  // 點雲共用 glow texture（軟光斑）
  const glowTex = useMemo(() => getGlowPointTexture(), []);

  // ─── 拖拽事件（window 層捕捉，確保 pointer 離開 mesh 也能追蹤） ─────
  useEffect(() => {
    function handleMove(e: PointerEvent) {
      if (!isDraggingRef.current) return;
      const eg = earthSpinRef.current;
      if (!eg) return;
      const dx = e.clientX - dragStartXRef.current;
      const dy = e.clientY - dragStartYRef.current;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
      if (didDragRef.current) {
        // 每 1000px 位移 ≈ 360° 旋轉，水平動 Y 軸、垂直動 X 軸
        eg.rotation.y = dragStartRotYRef.current + (dx / 1000) * Math.PI * 2;
        eg.rotation.x = dragStartRotXRef.current + (dy / 1000) * Math.PI * 2;
        document.body.style.cursor = "grabbing";
      }
    }

    function handleUp() {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.cursor = "";

      if (didDragRef.current) {
        // 拖拽結束 → 彈回起始 X + Y，繼續正常自轉
        springBackTargetRef.current = {
          x: dragStartRotXRef.current,
          y: dragStartRotYRef.current,
        };
      } else {
        // 純點擊（未超過門檻） → 平滑旋轉對正台灣
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

    // 地球自轉（四狀態：dragging / spring-back / snap-Taiwan / pause / 正常自轉）
    if (isDraggingRef.current) {
      // 拖拽中：rotation.y 由 pointermove 直接寫入，這裡不動
    } else if (springBackTargetRef.current !== null) {
      // 彈回：放開拖拽後，X + Y 雙軸同時指數緩出回到起始角度
      const tgt = springBackTargetRef.current;
      const distX = tgt.x - eg.rotation.x;
      const distY = tgt.y - eg.rotation.y;
      if (Math.abs(distX) < 0.003 && Math.abs(distY) < 0.003) {
        eg.rotation.x = tgt.x;
        eg.rotation.y = tgt.y;
        springBackTargetRef.current = null;
        // 彈回完成後直接繼續正常自轉，不暫停
      } else {
        eg.rotation.x += distX * 0.08;
        eg.rotation.y += distY * 0.08;
      }
    } else if (snapTargetYRef.current !== null) {
      // Snap 進行中：指數緩出插值，只動 Y 軸
      const dist = snapTargetYRef.current - eg.rotation.y;
      if (Math.abs(dist) < 0.003) {
        eg.rotation.y = snapTargetYRef.current;
        snapTargetYRef.current = null;
        pauseEndRef.current = clock.elapsedTime + 5; // 到達後再暫停 5 秒
      } else {
        eg.rotation.y += dist * 0.08; // 指數緩出：每幀縮短 8% 殘餘距離
      }
    } else if (clock.elapsedTime >= pauseEndRef.current) {
      // 正常自轉
      eg.rotation.y += 0.002;
    }
    // 暫停期間：什麼都不做，rotation.y 保持在台灣面向鏡頭的位置

    // ─── Camera 動畫（保留既有） ──────────────────────────────────
    if (skipBoot) {
      camera.position.z = 4;
    } else if (phase === "boot-0") {
      const t = Math.min(1, elapsed / 1200);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.z = 8 - 4 * eased;
    } else if (phase === "boot-1") {
      camera.position.z = 4;
    } else if (phase === "boot-2") {
      const t = Math.min(1, (elapsed - 3000) / 1600);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.position.z = 4 - 0.5 * eased;
      const targetY = -Math.atan2(TAIWAN_POS.x, TAIWAN_POS.z);
      const targetX = Math.atan2(TAIWAN_POS.y, Math.sqrt(TAIWAN_POS.x ** 2 + TAIWAN_POS.z ** 2));
      eg.rotation.y = THREE.MathUtils.lerp(eg.rotation.y, targetY, eased * 0.12);
      eg.rotation.x = THREE.MathUtils.lerp(eg.rotation.x, targetX, eased * 0.12);
    } else if (phase === "boot-3") {
      const t = Math.min(1, (elapsed - 4600) / 800);
      camera.position.z = 3.5 + 0.5 * t;
    } else {
      camera.position.z = 4;
    }

    // ─── Dissolve：地球 + 月球一起平移縮小（保留既有） ─────────────
    dg.position.x = 1.0 + dissolveProgress * 0.4;
    dg.position.y = dissolveProgress * 0.1;
    const scale = 1.56 * (1 - dissolveProgress * 0.28);
    dg.scale.setScalar(scale);

    // ─── Boot 期間 fade in（ocean core + land points 同步淡入） ────
    let baseOpacity = 1;
    if (!skipBoot && elapsed < 600) baseOpacity = elapsed / 600;
    if (oceanCoreMatRef.current) oceanCoreMatRef.current.opacity = 0.28 * baseOpacity;
    if (landMatRef.current) landMatRef.current.opacity = baseOpacity;

    // ─── Taiwan pin：雙環交替脈衝（sin 淡入淡出，錯位半周期） ────
    const PULSE_PERIOD = 2600; // ms
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

  // 月球可見度（boot-3 開始淡入到 idle 完整顯示）
  const moonVisibility = (() => {
    if (skipBoot) return 1;
    if (phase === "boot-0" || phase === "boot-1" || phase === "boot-2") return 0;
    if (phase === "boot-3") return 0.5;
    return 1;
  })();

  return (
    <>
      {/* 環境光（保留，不影響 points / lines） */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={0.7} />

      {/* === Earth + Moon dissolve group === */}
      <group ref={dissolveRef}>
        {/* 軸傾父層：23.5° */}
        <group rotation-z={EARTH_AXIAL_TILT_RAD}>
          <group ref={earthSpinRef}>
            {/* Layer 1: Transparent Ocean Core
                半透明深色球，accent-tinted（用 bg-deep 為基底，加入一點 accent 混色）
                透明度 0.28，depthWrite=false → 不擋住其他層 */}
            <mesh>
              <sphereGeometry args={[0.99, 48, 32]} />
              <meshBasicMaterial
                ref={oceanCoreMatRef}
                color={oceanCoreColor}
                transparent
                opacity={0.28}
                depthWrite={false}
              />
            </mesh>

            {/* Layer 2: Land Point Cloud
                ~10000 個點分佈在陸地位置，accent 色 + 6% 白/金 highlights
                AdditiveBlending + glow texture → sci-fi data-viz 質感 */}
            {landGeom && (
              <points geometry={landGeom} frustumCulled={false}>
                <pointsMaterial
                  ref={landMatRef}
                  color={0xffffff}
                  vertexColors
                  size={0.019}
                  sizeAttenuation
                  transparent
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  map={glowTex ?? undefined}
                  alphaTest={0.001}
                />
              </points>
            )}

            {/* Layer 3: Ocean Tide Glow — 純 event-based
                不再追蹤月球方向（那會變掃描帶），唯一亮度來源 = ripple wave-front
                + 微弱全球基底（4% 均勻，避免海洋完全黑） */}
            <OceanTideGlow
              geometry={oceanGeom}
              accentColor={accentColor}
              visibility={1}
              rippleFieldRef={rippleFieldRef}
            />

            {/* Layer 3b-ii: Ocean Tide Membrane — 薄 shader 球殼，wave-front 位移 + 發光
                radius 1.004（在 ocean particles 上方、land 下方）
                land mask 讓陸地自然消失，波紋遇陸地中斷 */}
            <OceanTideMembrane
              accentColor={accentColor}
              landMaskTexture={landMaskTex}
              rippleFieldRef={rippleFieldRef}
            />

            {/* Layer 3b: Tide Ripple Field — 純資料層，不渲染 geometry
                每 2.8~3.6 秒在 sub-lunar 點觸發 ripple event，2.2~3.0 秒擴到 ~1.25 rad（局部）
                origin 在生成瞬間鎖定。視覺由 OceanTideGlow 的粒子根據 wave-front 公式變亮 */}
            <TideRippleField
              ref={rippleFieldRef}
              moonRef={moonGroupRef}
              earthSpinRef={earthSpinRef}
            />

            {/* Layer 4: Atmosphere Shell
                Fresnel rim glow ShaderMaterial → 邊緣有 accent 色暈光 */}
            <AtmosphereShell
              accentColor={accentColor}
              radius={1.065}
              power={10.0}
              opacity={0.14}
              intensity={3.0}
            />

            {/* Taiwan 標記（三層設計）
                Layer A: 核心亮點 — 小球，accent 色，很亮
                Layer B: 靜態細環 — 32 段圓，常駐提示位置
                Layer C/D: 雙脈衝環 — sin 淡入淡出，半周期錯位，柔和呼吸感 */}

            {/* A: 核心亮點 */}
            <mesh position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <sphereGeometry args={[0.009, 12, 8]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.92}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* B: 靜態細環 */}
            <mesh position={TAIWAN_POS} onUpdate={(self) => self.lookAt(0, 0, 0)}>
              <ringGeometry args={[0.015, 0.019, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>

            {/* C: 脈衝環 1 */}
            <mesh
              ref={haloRef}
              position={TAIWAN_POS}
              onUpdate={(self) => self.lookAt(0, 0, 0)}
            >
              <ringGeometry args={[0.015, 0.018, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* D: 脈衝環 2（半周期錯位） */}
            <mesh
              ref={halo2Ref}
              position={TAIWAN_POS}
              onUpdate={(self) => self.lookAt(0, 0, 0)}
            >
              <ringGeometry args={[0.015, 0.018, 32, 1]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* 互動球殼：點擊 → snap 台灣；長按拖拽 → 旋轉球體，放開彈回
                · onPointerDown 啟動拖拽追蹤（move/up 由 window 層捕捉）
                · click vs drag 以 4px 門檻區分，邏輯在 window handleUp 內處理 */}
            <mesh
              frustumCulled={false}
              onPointerDown={(e) => {
                isDraggingRef.current = true;
                didDragRef.current = false;
                dragStartXRef.current = e.nativeEvent.clientX;
                dragStartYRef.current = e.nativeEvent.clientY;
                dragStartRotYRef.current = earthSpinRef.current?.rotation.y ?? 0;
                dragStartRotXRef.current = earthSpinRef.current?.rotation.x ?? 0;
                // 中斷任何進行中的 snap / spring-back
                snapTargetYRef.current = null;
                springBackTargetRef.current = null;
                e.stopPropagation();
              }}
              onPointerOver={() => { document.body.style.cursor = "grab"; }}
              onPointerOut={() => {
                if (!isDraggingRef.current) document.body.style.cursor = "";
              }}
            >
              <sphereGeometry args={[1.1, 32, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>

        {/* 月球（黃道座標系，不受地球軸傾影響） */}
        <Moon
          ref={moonGroupRef}
          accentColor={accentColor}
          visibility={moonVisibility}
        />

        {/* GravityField 已停用 — 視覺敘事改用 TideRippleField（純球面 ripple，無 beam） */}
      </group>

      {/* 背景星點 */}
      <Points positions={starPositions}>
        <PointMaterial color="#ffffff" size={0.03} transparent opacity={0.4} sizeAttenuation />
      </Points>
    </>
  );
}

interface GlobeSceneProps {
  phase: Phase;
  skipBoot: boolean;
  dissolveProgress: number;
  style?: React.CSSProperties;
}

export function GlobeScene({ phase, skipBoot, dissolveProgress, style }: GlobeSceneProps) {
  const [landGeom, setLandGeom] = useState<THREE.BufferGeometry | null>(null);
  const [oceanGeom, setOceanGeom] = useState<THREE.BufferGeometry | null>(null);
  const [landMaskTex, setLandMaskTex] = useState<THREE.DataTexture | null>(null);
  const [accentColor, setAccentColor] = useState<THREE.Color>(() => readAccentColor());
  const [oceanCoreColor, setOceanCoreColor] = useState<THREE.Color>(() => readBgDeepColor());

  // 主題切換時更新色彩 state（atmosphere shell 的 ShaderMaterial uniform 也會跟著更新）
  useEffect(() => {
    const sync = () => {
      setAccentColor(readAccentColor());
      setOceanCoreColor(readBgDeepColor());
    };
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => obs.disconnect();
  }, []);

  // 載入 GeoJSON + 預計算點雲
  useEffect(() => {
    let cancelled = false;
    fetch("/data/ne_110m_land.json")
      .then((r) => r.json() as Promise<GeoJSONFeatureCollection>)
      .then((data) => {
        if (cancelled) return;
        const hm = buildHeightmap(data);
        const land = buildLandPoints({
          heightmap: hm,
          accentColor: readAccentColor(),
          candidateCount: 90000,
          threshold: 100,
          highlightChance: 0.06,
        });
        const ocean = buildOceanPoints({
          heightmap: hm,
          candidateCount: 15000,
          threshold: 100,
          radius: 1.003,
        });
        // 建立 land-mask DataTexture（給 OceanTideMembrane shader 用）
        // 把單通道 heightmap 展開成 RGBA（R=heightmap value）
        const hmRGBA = new Uint8Array(256 * 128 * 4);
        for (let pi = 0; pi < hm.length; pi++) {
          hmRGBA[pi * 4]     = hm[pi];
          hmRGBA[pi * 4 + 1] = hm[pi];
          hmRGBA[pi * 4 + 2] = hm[pi];
          hmRGBA[pi * 4 + 3] = 255;
        }
        const maskTex = new THREE.DataTexture(hmRGBA, 256, 128, THREE.RGBAFormat);
        maskTex.minFilter = THREE.LinearFilter;
        maskTex.magFilter = THREE.LinearFilter;
        maskTex.needsUpdate = true;

        setLandGeom(land);
        setOceanGeom(ocean);
        setLandMaskTex(maskTex);
      })
      .catch((err) => {
        console.warn("[GlobeScene] failed to load ne_110m_land:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // 主題切換 → 直接 recolor 已存在的 land geometry（不重建、不 fetch GeoJSON）
  // 改動前：fetch + buildHeightmap + buildLandPoints (90k candidates) ≈ 80-150ms 卡頓
  // 改動後：讀 cache + 重算 colors attribute ≈ 1-3ms
  // 抓月球期間每 1.5s cycleTheme 不再 jank
  const prevAccentRef = useRef<string>(accentColor.getHexString());
  useEffect(() => {
    const newHex = accentColor.getHexString();
    if (prevAccentRef.current === newHex) return;
    prevAccentRef.current = newHex;

    if (landGeom) {
      recolorLandPoints(landGeom, accentColor);
    }
  }, [accentColor, landGeom]);

  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <Canvas
        camera={{ fov: 50, near: 0.01, far: 1000, position: [0, 0, 4] }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <GlobeInner
          phase={phase}
          skipBoot={skipBoot}
          dissolveProgress={dissolveProgress}
          landGeom={landGeom}
          oceanGeom={oceanGeom}
          oceanCoreColor={oceanCoreColor}
          accentColor={accentColor}
          landMaskTex={landMaskTex}
        />
      </Canvas>
    </div>
  );
}
