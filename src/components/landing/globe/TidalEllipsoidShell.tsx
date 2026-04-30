"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// ─── 潮汐橢圓殼物理模型 ────────────────────────────────────────────
//
// 真實潮汐：地球被月球（+ 太陽）的潮汐力拉成 prolate spheroid（長軸沿月球方向）
// 數學模型：vertex 半徑 = base × (1 + AMP × P2(cosθ))
//   P2(c) = (3c² - 1) / 2  ← Legendre 二階多項式
//   軸極點 (c=±1) → P2=1 → 凸出最高
//   赤道帶 (c=0)  → P2=-0.5 → 內縮（橢圓的腰部）
//
// 加上表面流體 noise 模擬「洋流擾動」，讓殼不是僵硬量體
// noise 用多層 sin/cos 疊加（無 perlin texture，純算術，極便宜）
// ────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */ `
  uniform vec3  uSubLunar;
  uniform float uTime;
  uniform float uTideAmp;
  uniform float uNoiseAmp;

  varying vec3  vLocalNormal;
  varying float vLegendre;
  varying float vNoise;

  void main() {
    vec3 n = normalize(position);
    vLocalNormal = n;

    // P2 Legendre：沿 sub-lunar 軸的潮汐拉長
    float c = dot(n, uSubLunar);
    float legendre = (3.0 * c * c - 1.0) * 0.5;
    vLegendre = legendre;

    // 流體擾動 noise（4 層多頻 sin/cos，無 texture）
    // 每層用不同頻率 + uTime 緩速漂移，模擬海流不規則翻動
    float n1 = sin(n.x * 11.0 + n.y * 7.0  + uTime * 0.55);
    float n2 = cos(n.z * 13.0 - n.x * 9.0  - uTime * 0.42);
    float n3 = sin((n.x + n.y) * 17.0 + uTime * 0.71);
    float n4 = cos((n.y - n.z) * 21.0 - uTime * 0.38);
    float fluidNoise = (n1 * 0.40 + n2 * 0.28 + n3 * 0.18 + n4 * 0.14);
    // 朝兩極的 noise 加重（潮汐隆起區擾動更明顯）
    fluidNoise *= 0.65 + abs(c) * 0.35;
    vNoise = fluidNoise;

    // 總 displacement：橢圓拉長 + 流體擾動
    float disp = legendre * uTideAmp + fluidNoise * uNoiseAmp;
    vec3 displaced = n * (1.0 + disp);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  #define PI 3.14159265359
  uniform vec3      uAccent;
  uniform float     uOpacity;
  uniform sampler2D uLandMask;

  varying vec3  vLocalNormal;
  varying float vLegendre;
  varying float vNoise;

  void main() {
    // Land mask 採樣（陸地處淡化，潮汐殼是「海面」概念）
    float lat = asin(clamp(vLocalNormal.y, -1.0, 1.0));
    float lng = atan(vLocalNormal.z, -vLocalNormal.x);
    vec2 uv = vec2((lng + PI) / (2.0 * PI), 0.5 - lat / PI);
    float landVal = texture2D(uLandMask, uv).r;
    float oceanFactor = 1.0 - smoothstep(0.30, 0.55, landVal);

    // 軸極潮汐隆起區：更亮（lLegendre > 0 處）
    float axisGlow = max(0.0, vLegendre);
    // 赤道腰部：淡
    float baseGlow = 0.06;

    // noise 擾動：高處（流體峰）提亮
    float noiseGlow = max(0.0, vNoise) * 0.18;

    float intensity = (baseGlow + axisGlow * 0.35 + noiseGlow) * oceanFactor;
    vec3 col = uAccent * intensity;
    // 潮汐峰白光點綴（讓「流動」感更強）
    col += vec3(1.0, 0.96, 0.78) * noiseGlow * 0.5;

    float a = clamp(intensity * uOpacity, 0.0, 0.55);
    gl_FragColor = vec4(col, a);
  }
`;

interface TidalEllipsoidShellProps {
  accentColor: THREE.Color;
  landMaskTexture: THREE.DataTexture | null;
  /** earth-local 月球方向 ref（每幀 GlobeScene 更新） */
  subLunarLocalRef: React.RefObject<THREE.Vector3>;
  visibility?: number;
  /** 橢圓拉長振幅（球半徑比例，0.05 = 5%） */
  tideAmp?: number;
  /** 流體 noise 振幅 */
  noiseAmp?: number;
}

/**
 * 桌面版潮汐橢圓殼
 *
 * 視覺設計（依使用者規格）：
 *   - 包覆地球的「橄欖球形」海洋層（prolate spheroid）
 *   - 長軸沿 sub-lunar 方向（月球潮汐力理論模型）
 *   - 表面有粒子流體擾動（不是僵硬量體）
 *   - 半透明、accent 色、AdditiveBlending
 *   - land mask 削弱陸地處
 *
 * Layer 位置：在 OceanTideMembrane 之後、AtmosphereShell 之前
 * 渲染成本：sphere(1.0, 96, 48) ≈ 9k tri，shader 純算術 noise，無 texture
 */
export function TidalEllipsoidShell({
  accentColor,
  landMaskTexture,
  subLunarLocalRef,
  visibility = 1,
  tideAmp = 0.038,
  noiseAmp = 0.012,
}: TidalEllipsoidShellProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uAccent:    { value: accentColor.clone() },
      uSubLunar:  { value: new THREE.Vector3(1, 0, 0) },
      uTime:      { value: 0 },
      uTideAmp:   { value: tideAmp },
      uNoiseAmp:  { value: noiseAmp },
      uOpacity:   { value: 0 },
      uLandMask:  { value: landMaskTexture },
    }),
    // accentColor / landMaskTexture 變化由下方 useEffect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uAccent.value.copy(accentColor);
  }, [accentColor, uniforms]);

  useEffect(() => {
    uniforms.uLandMask.value = landMaskTexture;
  }, [landMaskTexture, uniforms]);

  useFrame((state) => {
    if (subLunarLocalRef.current) {
      uniforms.uSubLunar.value.copy(subLunarLocalRef.current);
    }
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uOpacity.value = visibility;
  });

  return (
    <mesh renderOrder={3}>
      {/* base sphere 1.0；vertex shader 自己拉長到橢圓（避免 React-side scale 跟 shader 重複位移） */}
      <sphereGeometry args={[1.0, 96, 48]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
