"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { TideRippleFieldHandle } from "./TideRippleField";

// 靜態常數上限：GLSL 的 for loop 上界必須是 compile-time 常數
const MAX_RIPPLES = 3;

// ─── Vertex shader ─────────────────────────────────────────────────────────
// 根據 active ripples 的 wave-front 做 radial displacement
// position 全部是球面點（normalize(position) = local normal），
// ripple origin 也是 earth local frame → 可以直接 dot 比較
const VERTEX_SHADER = /* glsl */ `
  uniform float uBaseRadius;
  uniform float uHeightStrength;
  uniform float uWaveWidth;
  uniform vec3  uRippleOrigins[3];
  uniform float uRippleRadii[3];
  uniform float uRippleFades[3];
  uniform int   uRippleCount;

  varying vec3 vLocalNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 n = normalize(position); // earth-local unit normal（sphere 頂點 / r）
    vLocalNormal = n;

    float displacement = 0.0;
    for (int k = 0; k < 3; k++) {
      if (k >= uRippleCount) break;
      float cosA  = dot(n, uRippleOrigins[k]);
      float angDist = acos(clamp(cosA, -1.0, 1.0));
      float delta   = (angDist - uRippleRadii[k]) / uWaveWidth;
      float wave    = exp(-delta * delta);
      displacement += wave * uRippleFades[k] * uHeightStrength;
    }

    // 把頂點沿 normal 推出去（從基準半徑 + 位移量）
    vec3 displaced = n * (uBaseRadius + displacement);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

// ─── Fragment shader ────────────────────────────────────────────────────────
// 用 uLandMask（256×128 DataTexture）判斷海陸
// 海洋 = oceanMask 高，陸地 = 接近 0 → 陸地上方自然消失
// wave-front 增加 alpha → 波紋遇陸地中斷
const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3  uColor;
  uniform float uBaseOpacity;
  uniform float uWaveOpacityBoost;
  uniform float uWaveWidth;
  uniform float uLandThreshold;
  uniform sampler2D uLandMask;
  uniform vec3  uRippleOrigins[3];
  uniform float uRippleRadii[3];
  uniform float uRippleFades[3];
  uniform int   uRippleCount;

  varying vec3 vLocalNormal;
  varying vec2 vUv;

  void main() {
    // heightmap 高 = 陸地，低 = 海洋；smoothstep 做軟邊
    float landVal  = texture2D(uLandMask, vUv).r;
    float oceanMask = 1.0 - smoothstep(uLandThreshold - 0.06, uLandThreshold + 0.06, landVal);

    float waveAlpha = 0.0;
    for (int k = 0; k < 3; k++) {
      if (k >= uRippleCount) break;
      float cosA    = dot(vLocalNormal, uRippleOrigins[k]);
      float angDist = acos(clamp(cosA, -1.0, 1.0));
      float delta   = (angDist - uRippleRadii[k]) / uWaveWidth;
      float wave    = exp(-delta * delta);
      waveAlpha += wave * uRippleFades[k] * uWaveOpacityBoost;
    }

    float alpha = (uBaseOpacity + waveAlpha) * oceanMask;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface OceanTideMembraneProps {
  accentColor: THREE.Color;
  /** 256×128 land-mask DataTexture（land > threshold = white, ocean = dark） */
  landMaskTexture: THREE.DataTexture | null;
  rippleFieldRef?: React.RefObject<TideRippleFieldHandle | null>;
  visibility?: number;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * 海洋潮汐水膜 — Shader-based 透明球殼
 *
 * 比 OceanTideGlow（粒子層）多了兩件事：
 *   1. vertex displacement：wave-front 經過時整片海面隆起，像真實潮汐
 *   2. land mask：陸地上方 alpha 接近 0，波紋遇到陸地自然中斷
 *
 * 定位：
 *   radius 1.004 → 在 ocean particles (1.003) 上方一點點
 *              → 在 land points (1.022) 下方 → 不蓋住大陸
 *   AdditiveBlending → 海面在地球上發光，不蓋住下方顏色
 */
export function OceanTideMembrane({
  accentColor,
  landMaskTexture,
  rippleFieldRef,
  visibility = 1,
}: OceanTideMembraneProps) {
  // 主題切換時平滑插值顏色
  const smoothAccentRef = useRef(accentColor.clone());

  // dummy 1×1 texture 佔位，等 landMaskTexture 載入後替換
  const dummyTex = useMemo(() => {
    const d = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    d.needsUpdate = true;
    return d;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uBaseRadius:       { value: 1.004 },
        uHeightStrength:   { value: 0.013 },
        uWaveWidth:        { value: 0.10 },
        uBaseOpacity:      { value: 0.05 },
        uWaveOpacityBoost: { value: 0.22 },
        uLandThreshold:    { value: 100.0 / 255.0 },
        uLandMask:         { value: dummyTex },
        uColor:            { value: new THREE.Color() },
        uRippleOrigins:    { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector3()) },
        uRippleRadii:      { value: new Float32Array(MAX_RIPPLES) },
        uRippleFades:      { value: new Float32Array(MAX_RIPPLES) },
        uRippleCount:      { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    return mat;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只建一次，uniforms 在 useFrame 更新

  useFrame(({ clock }, dt) => {
    // 更新 land mask texture（載入後只換一次）
    if (landMaskTexture && material.uniforms.uLandMask.value !== landMaskTexture) {
      material.uniforms.uLandMask.value = landMaskTexture;
    }

    // 顏色平滑插值 + visibility → 套到 baseOpacity
    smoothAccentRef.current.lerp(accentColor, 1 - Math.exp(-dt * 3));
    material.uniforms.uColor.value.copy(smoothAccentRef.current);
    material.uniforms.uBaseOpacity.value = 0.05 * visibility;
    material.uniforms.uWaveOpacityBoost.value = 0.22 * visibility;

    if (!rippleFieldRef?.current) {
      material.uniforms.uRippleCount.value = 0;
      return;
    }

    const t = clock.elapsedTime;
    const ripples = rippleFieldRef.current.getActiveRipples();
    const origins = material.uniforms.uRippleOrigins.value as THREE.Vector3[];
    const radii = material.uniforms.uRippleRadii.value as Float32Array;
    const fades = material.uniforms.uRippleFades.value as Float32Array;

    let count = 0;
    for (let k = 0; k < ripples.length && count < MAX_RIPPLES; k++) {
      const r = ripples[k];
      const elapsed = t - r.startTime;
      if (elapsed < 0 || elapsed >= r.lifetime) continue;

      const t01 = elapsed / r.lifetime;
      const leadingEdge = smoothstep(0, 0.25, elapsed) * (1 - smoothstep(0.65, 1.0, t01));

      origins[count].copy(r.origin);
      radii[count] = elapsed * r.speed;
      fades[count] = leadingEdge;
      count++;
    }
    material.uniforms.uRippleCount.value = count;
  });

  return (
    <mesh frustumCulled={false}>
      {/* 96×48 分段：頂點足夠讓位移平滑，效能可接受 */}
      <sphereGeometry args={[1.004, 96, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
