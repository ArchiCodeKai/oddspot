"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

// Fresnel rim glow
//   fresnel = pow(1 - dot(N, V), uPower)
//   正面 (N ≈ V) → fresnel ≈ 0     → 完全透明
//   邊緣 (N ⊥ V) → fresnel ≈ 1     → rim glow
// 顏色與 alpha 都被 fresnel 主導 → 中央接近 0、邊緣才亮起來，避免「透明罩」感
const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewPos;
  void main() {
    vec3 viewDir = normalize(-vViewPos);
    float cosA = max(0.0, dot(vNormal, viewDir));
    // Fresnel：正面 cosA≈1 → raw≈0；邊緣 cosA≈0 → raw≈1
    float raw = 1.0 - cosA;
    float fresnel = pow(raw, uPower);
    // smoothstep 只壓掉最前方一點點殘餘，保留從邊緣往內的柔和漸層
    fresnel = smoothstep(0.0, 0.04, fresnel);
    vec3 col = uColor * uIntensity * fresnel;
    gl_FragColor = vec4(col, fresnel * uOpacity);
  }
`;

interface AtmosphereShellProps {
  accentColor: THREE.Color;
  /** Shell 半徑（地球本體 1.0，shell 略大才會有暈光） */
  radius?: number;
  /** Fresnel 強度指數（越大邊緣越尖、中央越透明） */
  power?: number;
  /** 邊緣最大不透明度（已經很低，靠 intensity 把亮度補回去） */
  opacity?: number;
  /** 邊緣顏色 boost（搭 AdditiveBlending 讓 rim 發光） */
  intensity?: number;
}

/**
 * 大氣層光殼 — Fresnel rim glow ShaderMaterial
 *
 * 設計目標：從正面看幾乎看不到大氣層、只有邊緣一圈淡淡光暈
 *   - 不是「透明塑膠罩套在地球外」
 *   - 不應該把整顆球塗一層 accent
 *
 * 做法：
 *   - sphere geometry，半徑 1.06
 *   - BackSide 渲染（看到內側 → fresnel 在外圈 = rim）
 *   - Fragment 把 fresnel 同時套在 RGB 與 alpha → 中央 RGB 也是 0，避免重疊出現整體著色
 *   - AdditiveBlending → 邊緣可以發光不擋住內層
 */
export function AtmosphereShell({
  accentColor,
  radius = 1.065,
  power = 10.0,
  opacity = 0.14,
  intensity = 3.0,
}: AtmosphereShellProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: {
          uColor: { value: accentColor.clone() },
          uOpacity: { value: opacity },
          uPower: { value: power },
          uIntensity: { value: intensity },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [accentColor, opacity, power, intensity],
  );

  // 主題切換時更新 uColor uniform（不重建 material）
  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.uColor.value.copy(accentColor);
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 32]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
