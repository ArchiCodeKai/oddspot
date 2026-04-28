"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// 3 條彎曲弧線連結 Earth-Moon — 取代之前的「圓筒 + 通道」感
// 每條弧用 quadratic bezier，控制點偏移在不同方向 → 看起來像幾條代表性的「重力場線」
// 真實的潮汐效果由 OceanWaves 的全球橢球變形（tidal bulge）負責，這裡只負責「視覺連結」
const NUM_CURVES = 3;
const SEGMENTS = 48;          // 每條曲線分段數
const BOW_AMP = 0.18;         // 中段彎曲幅度（相對 Earth-Moon 軸）
const BREATH_SPEED = 0.35;    // 弧線繞主軸的呼吸速度

interface GravityFieldProps {
  /** 月球本體 group ref */
  moonRef: React.RefObject<THREE.Group | null>;
  /** dissolveRef 外層，用來把月球座標轉到本地 */
  dissolveRef: React.RefObject<THREE.Group | null>;
  accentColor: THREE.Color;
  visibility?: number;
}

/**
 * Earth ↔ Moon 重力場線
 *
 * 3 條 quadratic bezier curves，從 Earth 表面出發，彎曲到月球。
 * 每條控制點在垂直軸的方向不同 → 形成「3 條場線從不同角度繞過去」的感覺
 * 隨時間整體繞主軸緩慢旋轉，呈現「場域在運作」
 *
 * 不再有圓筒 tube（user feedback：太像光通道）
 * 真正的潮汐物理由 OceanWaves 內的 tidal bulge 全球橢球變形負責
 */
export function GravityField({
  moonRef,
  dissolveRef,
  accentColor,
  visibility = 1,
}: GravityFieldProps) {
  const linesRef = useRef<THREE.LineSegments>(null);

  // 預配 LineSegments geometry：NUM_CURVES × (SEGMENTS+1) 個 vertex
  // 每條 curve 內部用 SEGMENTS 個 line segment 連起來
  const linesGeom = useMemo(() => {
    const totalVerts = NUM_CURVES * (SEGMENTS + 1);
    const positions = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 4); // RGBA

    // 每條 curve 的 alpha 漸變：sin(t·π) 端點 0、中段 1
    for (let c = 0; c < NUM_CURVES; c++) {
      for (let s = 0; s <= SEGMENTS; s++) {
        const t = s / SEGMENTS;
        const idx = c * (SEGMENTS + 1) + s;
        const fade = Math.sin(t * Math.PI);
        colors[idx * 4]     = 1;
        colors[idx * 4 + 1] = 1;
        colors[idx * 4 + 2] = 1;
        colors[idx * 4 + 3] = fade * 0.55; // 中段 peak 0.55
      }
    }

    // Indices：每條 curve 內相鄰兩 vertex 配對成 line segment
    const indices: number[] = [];
    for (let c = 0; c < NUM_CURVES; c++) {
      const base = c * (SEGMENTS + 1);
      for (let s = 0; s < SEGMENTS; s++) {
        indices.push(base + s, base + s + 1);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 4));
    g.setIndex(indices);
    return g;
  }, []);

  // Reusable temp vectors
  const tmpMoon = useMemo(() => new THREE.Vector3(), []);
  const tmpEarth = useMemo(() => new THREE.Vector3(), []);
  const tmpAxis = useMemo(() => new THREE.Vector3(), []);
  const tmpUp = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tmpPerp1 = useMemo(() => new THREE.Vector3(), []);
  const tmpPerp2 = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const lines = linesRef.current;
    const moon = moonRef.current;
    const dissolve = dissolveRef.current;
    if (!lines || !moon || !dissolve) return;

    moon.getWorldPosition(tmpMoon);
    dissolve.worldToLocal(tmpMoon);

    // 地球側端點：sub-lunar 表面點
    tmpEarth.copy(tmpMoon).normalize().multiplyScalar(1.04);

    // Earth-Moon 軸
    tmpAxis.copy(tmpMoon).sub(tmpEarth).normalize();

    // 兩個垂直向量（給控制點偏移用）
    if (Math.abs(tmpAxis.dot(tmpUp)) > 0.999) {
      tmpPerp1.set(1, 0, 0);
    } else {
      tmpPerp1.copy(tmpAxis).cross(tmpUp).normalize();
    }
    tmpPerp2.copy(tmpAxis).cross(tmpPerp1).normalize();

    const t = clock.elapsedTime;
    const breath = t * BREATH_SPEED;

    const positions = linesGeom.getAttribute("position") as THREE.BufferAttribute;
    const posArr = positions.array as Float32Array;

    for (let c = 0; c < NUM_CURVES; c++) {
      const phase = (c / NUM_CURVES) * Math.PI * 2 + breath;
      const cosP = Math.cos(phase);
      const sinP = Math.sin(phase);

      // 控制點（中段偏移，決定弧的彎曲方向）
      // midpoint = (earthEnd + moonPos) / 2
      const mx = (tmpEarth.x + tmpMoon.x) * 0.5;
      const my = (tmpEarth.y + tmpMoon.y) * 0.5;
      const mz = (tmpEarth.z + tmpMoon.z) * 0.5;

      // 偏移向量 = perp1·cos(phase) + perp2·sin(phase)，乘 BOW_AMP
      const ox = (tmpPerp1.x * cosP + tmpPerp2.x * sinP) * BOW_AMP;
      const oy = (tmpPerp1.y * cosP + tmpPerp2.y * sinP) * BOW_AMP;
      const oz = (tmpPerp1.z * cosP + tmpPerp2.z * sinP) * BOW_AMP;

      const ctrlX = mx + ox;
      const ctrlY = my + oy;
      const ctrlZ = mz + oz;

      // Quadratic Bezier：B(t) = (1-t)²P0 + 2(1-t)t P1 + t² P2
      for (let s = 0; s <= SEGMENTS; s++) {
        const tt = s / SEGMENTS;
        const omt = 1 - tt;
        const omt2 = omt * omt;
        const tt2 = tt * tt;
        const twoOmtT = 2 * omt * tt;

        const px = omt2 * tmpEarth.x + twoOmtT * ctrlX + tt2 * tmpMoon.x;
        const py = omt2 * tmpEarth.y + twoOmtT * ctrlY + tt2 * tmpMoon.y;
        const pz = omt2 * tmpEarth.z + twoOmtT * ctrlZ + tt2 * tmpMoon.z;

        const idx = c * (SEGMENTS + 1) + s;
        posArr[idx * 3]     = px;
        posArr[idx * 3 + 1] = py;
        posArr[idx * 3 + 2] = pz;
      }
    }
    positions.needsUpdate = true;
  });

  return (
    <lineSegments
      ref={linesRef}
      geometry={linesGeom}
      frustumCulled={false}
    >
      <lineBasicMaterial
        color={accentColor}
        vertexColors
        transparent
        opacity={visibility}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}
