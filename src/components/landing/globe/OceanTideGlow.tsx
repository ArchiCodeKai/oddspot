"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getGlowPointTexture } from "./glowPointTexture";
import type { TideRippleFieldHandle } from "./TideRippleField";

interface OceanTideGlowProps {
  /** 海洋點雲 geometry（buildOceanPoints 產生，含 basePosition attribute） */
  geometry: THREE.BufferGeometry | null;
  accentColor: THREE.Color;
  visibility?: number;
  /** TideRippleField handle，唯一動態源 = ripple wave-front */
  rippleFieldRef?: React.RefObject<TideRippleFieldHandle | null>;
}

const BASE_OCEAN_RADIUS = 1.003;
const RIPPLE_WAVE_WIDTH = 0.085;        // gaussian wave-front 寬度（rad）
const RIPPLE_HEIGHT_STRENGTH = 0.014;   // wave-front 經過時的 radial displacement 上限
const RIPPLE_BRIGHTNESS_STRENGTH = 4.5; // wave-front 經過時的亮度倍率
const AMBIENT_BASELINE = 0.02;          // 海洋極弱基底（避免完全黑）

/**
 * 海洋潮汐光點 — 表面波紋（高度 + 亮度 雙重表現）
 *
 * 每幀做兩件事：
 *   1. radial displacement：position = baseNormal * (BASE_OCEAN_RADIUS + Σ waveFront × fade × HEIGHT_STRENGTH)
 *      → 海面被 ripple wave-front 推起，像潮汐波
 *   2. brightness：color = accent × Σ waveFront × fade × viewFacing × BRIGHTNESS_STRENGTH
 *      → 同時加亮 wave-front 上的粒子
 *
 * 每幀都從 basePosition 重新計算（不在已位移的 position 上累加）→ 不會漂移
 *
 * 公式（per particle, per ripple）：
 *   angDist     = acos(dot(baseNormal, ripple.origin))
 *   waveFront   = exp(-((angDist - angularRadius) / waveWidth)²)
 *   leadingEdge = smoothstep(0, 0.25, elapsed) * (1 - smoothstep(0.65, 1, t01))
 *   viewFacing  = smoothstep(-0.05, 0.35, dot(baseNormal, camDirLocal))
 *   displacement += waveFront * leadingEdge * HEIGHT_STRENGTH
 *   intensity    += waveFront * leadingEdge * viewFacing * BRIGHTNESS_STRENGTH
 *
 * 陸地沒有 ocean points → 波紋遇陸地自然中斷
 * 背面 viewFacing≈0 → 不穿透到正面
 */

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function OceanTideGlow({
  geometry,
  accentColor,
  visibility = 1,
  rippleFieldRef,
}: OceanTideGlowProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const glowTex = useMemo(() => getGlowPointTexture(), []);
  const tmpCamLocal = useMemo(() => new THREE.Vector3(), []);
  // 主題切換時平滑插值顏色
  const smoothAccentRef = useRef(accentColor.clone());

  const { camera } = useThree();

  useFrame(({ clock }, dt) => {
    const points = pointsRef.current;
    if (!points || !geometry) return;

    const t = clock.elapsedTime;
    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const basePositions = geometry.getAttribute("basePosition") as THREE.BufferAttribute | undefined;
    const colors = geometry.getAttribute("color") as THREE.BufferAttribute;

    // basePosition fallback（理論上 buildOceanPoints 一定有）
    if (!basePositions) return;

    const posArr = positions.array as Float32Array;
    const baseArr = basePositions.array as Float32Array;
    const colorArr = colors.array as Float32Array;
    const count = positions.count;

    // 主題切換平滑插值
    smoothAccentRef.current.lerp(accentColor, 1 - Math.exp(-dt * 3));
    const aR = smoothAccentRef.current.r;
    const aG = smoothAccentRef.current.g;
    const aB = smoothAccentRef.current.b;

    const ripples = rippleFieldRef?.current?.getActiveRipples() ?? [];

    // Camera 方向轉到 points 的 local frame
    camera.getWorldPosition(tmpCamLocal);
    points.worldToLocal(tmpCamLocal);
    tmpCamLocal.normalize();
    const cx = tmpCamLocal.x;
    const cy = tmpCamLocal.y;
    const cz = tmpCamLocal.z;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // 從 basePosition 取（不會被位移污染）
      const bx = baseArr[i3];
      const by = baseArr[i3 + 1];
      const bz = baseArr[i3 + 2];
      const baseR = Math.sqrt(bx * bx + by * by + bz * bz) || 1; // ≈ 1.003
      const nx = bx / baseR;
      const ny = by / baseR;
      const nz = bz / baseR;

      const viewDot = nx * cx + ny * cy + nz * cz;
      const viewFacing = smoothstep(-0.05, 0.35, viewDot);

      let intensity = AMBIENT_BASELINE * viewFacing;
      let displacement = 0;

      for (let k = 0; k < ripples.length; k++) {
        const ripple = ripples[k];
        const elapsed = t - ripple.startTime;
        if (elapsed < 0 || elapsed >= ripple.lifetime) continue;

        const angularRadius = elapsed * ripple.speed;
        const dotR = nx * ripple.origin.x + ny * ripple.origin.y + nz * ripple.origin.z;
        const angDist = Math.acos(Math.max(-1, Math.min(1, dotR)));

        const delta = (angDist - angularRadius) / RIPPLE_WAVE_WIDTH;
        const waveFront = Math.exp(-delta * delta);

        const t01 = elapsed / ripple.lifetime;
        const leadingEdge = smoothstep(0, 0.25, elapsed) * (1 - smoothstep(0.65, 1.0, t01));

        // 高度位移（不乘 viewFacing → 高度全球都有，只是被 viewFacing 控制亮度的視覺對比）
        displacement += waveFront * leadingEdge * RIPPLE_HEIGHT_STRENGTH;
        // 亮度（乘 viewFacing → 背面不亮，避免穿透）
        intensity += waveFront * leadingEdge * viewFacing * RIPPLE_BRIGHTNESS_STRENGTH;
      }

      // 寫回 position：baseNormal × (baseR + displacement)
      const finalR = BASE_OCEAN_RADIUS + displacement;
      posArr[i3]     = nx * finalR;
      posArr[i3 + 1] = ny * finalR;
      posArr[i3 + 2] = nz * finalR;

      // 寫回 color
      const I = intensity * visibility;
      colorArr[i3]     = aR * I;
      colorArr[i3 + 1] = aG * I;
      colorArr[i3 + 2] = aB * I;
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  });

  if (!geometry) return null;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color={0xffffff}
        vertexColors
        size={0.022}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={glowTex ?? undefined}
        alphaTest={0.001}
      />
    </points>
  );
}
