"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useRef, useMemo, useState, useEffect } from "react";
import * as THREE from "three";

// Per-theme iridescent palettes — matches themes.css accent families
const PALETTES: Record<string, { primary: THREE.Color; second: THREE.Color; pearl: THREE.Color; dark: THREE.Color }> = {
  terminal: {
    primary: new THREE.Color(0x00e5cc),  // mint cyan
    second:  new THREE.Color(0x8524e6),  // violet
    pearl:   new THREE.Color(0xddf5ef),  // mint white
    dark:    new THREE.Color(0x0c1714),  // bg-deep
  },
  blueprint: {
    primary: new THREE.Color(0x4f7dff),  // electric blue
    second:  new THREE.Color(0x2e1fa3),  // deep indigo
    pearl:   new THREE.Color(0xd8e4ff),  // sky white
    dark:    new THREE.Color(0x0f1219),  // bg-deep
  },
  caution: {
    primary: new THREE.Color(0xffd24a),  // hazard amber
    second:  new THREE.Color(0xff7a00),  // burnt orange
    pearl:   new THREE.Color(0xfff4d6),  // warm cream
    dark:    new THREE.Color(0x14110b),  // bg-deep
  },
  midnight: {
    primary: new THREE.Color(0xd6d6dc),  // silver
    second:  new THREE.Color(0x6a7ca8),  // steel blue
    pearl:   new THREE.Color(0xf4f4f6),  // near-white
    dark:    new THREE.Color(0x101012),  // bg-deep
  },
};

function getTheme(): string {
  if (typeof document === "undefined") return "terminal";
  return document.documentElement.getAttribute("data-theme") ?? "terminal";
}

// ─────────────────────────────────────────────────────────────────
// Vertex Shader — mouth-open singing, brow furrow, lip tremble
// ─────────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uMouthOpen;
  uniform float uBrowStrain;
  uniform float uTremble;

  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;

  void main() {
    vec3 pos = position;

    float h = (pos.y + 1.2) / 2.4;

    float xzLen = length(pos.xz);
    float frontness = xzLen > 0.001 ? max(0.0, pos.z / xzLen) : 0.0;
    float cx = 1.0 - smoothstep(0.0, 0.45, abs(pos.x));

    // ── MOUTH OPEN ──────────────────────────────────────────────
    float mouthH     = smoothstep(0.34, 0.39, h) * (1.0 - smoothstep(0.45, 0.49, h));
    float mouthFront = smoothstep(0.15, 0.55, pos.z);
    float tremble    = uTremble * sin(uTime * 22.0 + pos.x * 8.0) * 0.012;
    pos.y -= (uMouthOpen * 0.18 + tremble) * mouthH * mouthFront;
    pos.z += uMouthOpen * 0.07 * mouthH * mouthFront * cx;

    // ── BROW FURROW ─────────────────────────────────────────────
    float browH  = smoothstep(0.68, 0.72, h) * (1.0 - smoothstep(0.80, 0.84, h));
    float medial = 1.0 - smoothstep(0.0, 0.40, abs(pos.x));
    pos.y -= uBrowStrain * 0.12 * browH * frontness;
    pos.x -= sign(pos.x) * uBrowStrain * 0.10 * browH * medial * frontness;

    // ── OUTPUT ──────────────────────────────────────────────────
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vPos         = pos;
    vNormal      = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir     = normalize(cameraPosition - worldPos.xyz);
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────
// Fragment Shader — thin-film iridescence + directional lighting
// ─────────────────────────────────────────────────────────────────
const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uHoverGlow;
  uniform vec3  uPrimary;
  uniform vec3  uSecond;
  uniform vec3  uPearl;
  uniform vec3  uDark;

  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vPos;

  void main() {
    vec3 N  = normalize(vNormal);
    vec3 Nw = normalize(vWorldNormal);
    vec3 V  = normalize(vViewDir);
    if (dot(N, V) < 0.0) { N = -N; Nw = -Nw; }

    float cosTheta = max(dot(N, V), 0.0);
    float fresnel  = pow(1.0 - cosTheta, 1.7);

    float facePhase = vPos.x * 4.3 + vPos.y * 3.1 + vPos.z * 1.9;
    float t = uTime * 0.22 + facePhase;

    float r = 0.5 + 0.5 * cos(t * 2.9 + 0.000);
    float g = 0.5 + 0.5 * cos(t * 3.2 + 2.094);
    float b = 0.5 + 0.5 * cos(t * 2.6 + 4.189);

    vec3 irid  = mix(mix(uPrimary, uSecond, r), uPearl, b * 0.38);
    vec3 color = mix(uDark, irid, 0.42 + cosTheta * 0.42 + fresnel * 0.50);
    color += uPrimary * 0.10;

    // ── Directional lighting (world-space, fixed) ──
    vec3 keyDir  = normalize(vec3(0.2, 0.70, 1.0));
    vec3 fillDir = normalize(vec3(-0.55, 0.25, 0.80));
    float diff   = max(dot(Nw, keyDir),  0.0);
    float fill   = max(dot(Nw, fillDir), 0.0) * 0.32;
    color *= 0.28 + diff * 0.58 + fill;

    // Death-metal hover glow — bleach + saturate the face into pure light
    float hvr = uHoverGlow;
    color += vec3(0.95, 0.97, 1.0) * hvr * fresnel * 1.2;
    color += uPrimary * hvr * (fresnel * 1.7 + 0.38);
    color  = mix(color, uPrimary * 2.3, hvr * 0.30 * fresnel);

    float edge = smoothstep(0.04, 0.42, cosTheta);
    color *= 0.22 + 0.78 * edge;

    // CRT scanlines — 3px period, subtle periodic darkening like a CRT tube
    float scan = sin(gl_FragCoord.y * 2.094) * 0.5 + 0.5;
    color *= 0.84 + 0.16 * scan;

    gl_FragColor = vec4(color, 0.95 + edge * 0.05);
  }
`;

// ─────────────────────────────────────────────────────────────────
// Build smooth-shaded geometry from a GLTF mesh (Option A)
// Keeps the index buffer so shared vertices get averaged normals →
// smooth iridescent colour flow instead of hard per-face bands.
// ─────────────────────────────────────────────────────────────────
function buildSmoothGeo(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = src.clone(); // keep indexed for smooth normals

  g.computeBoundingBox();
  const center = new THREE.Vector3();
  g.boundingBox!.getCenter(center);
  g.translate(-center.x, -center.y, -center.z);

  g.computeBoundingBox();
  const size = new THREE.Vector3();
  g.boundingBox!.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const s = 1.2 / (maxDim * 0.5);
    g.scale(s, s, s);
  }

  // computeVertexNormals on indexed geometry = smooth averaged normals
  g.computeVertexNormals();
  return g;
}

// ─────────────────────────────────────────────────────────────────
// HeadMeshContent — GLTF bust with iridescent ShaderMaterial
// ─────────────────────────────────────────────────────────────────
type MouseTarget = { rotY: number; rotX: number; active: boolean };

// After applyMatrix4 bake the face geometry points toward +X.
// Rotating by -π/2 around Y maps +X → +Z (toward camera). ≈ -1.5708
const BASE_Y = -Math.PI / 2;

function HeadMeshContent({ active, mouseTarget }: { active: boolean; mouseTarget: React.RefObject<MouseTarget> }) {
  const { scene } = useGLTF("/models/low_poly_bust.glb");
  const meshRef = useRef<THREE.Mesh>(null);
  const initDone = useRef(false);

  const geo = useMemo(() => {
    let srcGeo: THREE.BufferGeometry | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !srcGeo) {
        const g = (child.geometry as THREE.BufferGeometry).clone();
        // Apply world transform (bakes Sketchfab's Z-up → Y-up rotation)
        g.applyMatrix4(child.matrixWorld);
        srcGeo = g;
      }
    });
    if (!srcGeo) return new THREE.BoxGeometry(1, 1.5, 0.6);
    return buildSmoothGeo(srcGeo);
  }, [scene]);

  const mat = useMemo(() => {
    const p = PALETTES[getTheme()] ?? PALETTES.terminal;
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime:       { value: 0 },
        uMouthOpen:  { value: 0 },
        uBrowStrain: { value: 0 },
        uTremble:    { value: 0 },
        uHoverGlow:  { value: 0 },
        uPrimary:    { value: p.primary.clone() },
        uSecond:     { value: p.second.clone() },
        uPearl:      { value: p.pearl.clone() },
        uDark:       { value: p.dark.clone() },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  // Update palette uniforms whenever data-theme changes
  useEffect(() => {
    const apply = () => {
      const p = PALETTES[getTheme()] ?? PALETTES.terminal;
      mat.uniforms.uPrimary.value.copy(p.primary);
      mat.uniforms.uSecond.value.copy(p.second);
      mat.uniforms.uPearl.value.copy(p.pearl);
      mat.uniforms.uDark.value.copy(p.dark);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [mat]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const u = mat.uniforms;
    const t = clock.elapsedTime;

    u.uTime.value = t;

    // First frame: snap directly to BASE_Y so we don't animate from Math.PI
    if (!initDone.current) {
      mesh.rotation.set(0, BASE_Y, 0);
      initDone.current = true;
    }

    const mt = mouseTarget.current;
    const targetY = mt.active ? BASE_Y + mt.rotY : BASE_Y + Math.sin(t * 0.4) * 0.13;
    const targetX = mt.active ? mt.rotX : 0;

    mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, targetY, 0.028);
    mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetX, 0.028);

    if (active) {
      // Hover: strained face, trembling lips, glow
      u.uMouthOpen.value  = THREE.MathUtils.lerp(u.uMouthOpen.value,  0.85, 0.06);
      u.uBrowStrain.value = THREE.MathUtils.lerp(u.uBrowStrain.value, 0.9,  0.06);
      u.uTremble.value    = THREE.MathUtils.lerp(u.uTremble.value,    1.0,  0.08);
      u.uHoverGlow.value  = THREE.MathUtils.lerp(u.uHoverGlow.value,  1.0,  0.08);
    } else {
      // Idle: gentle breath-open
      const idle = 0.08 + 0.06 * Math.sin(t * 1.8);
      u.uMouthOpen.value  = THREE.MathUtils.lerp(u.uMouthOpen.value,  idle, 0.04);
      u.uBrowStrain.value = THREE.MathUtils.lerp(u.uBrowStrain.value, 0.0,  0.04);
      u.uTremble.value    = THREE.MathUtils.lerp(u.uTremble.value,    0.0,  0.04);
      u.uHoverGlow.value  = THREE.MathUtils.lerp(u.uHoverGlow.value,  0.0,  0.06);
    }
  });

  // rotation.y=Math.PI flips bust to face +Z (toward camera).
  // Y=-0.3 compensates for the face being in the upper half of the
  // bounding box (neck/shoulder geometry pulls geometric centre downward).
  // No rotation prop — initDone snap in useFrame sets BASE_Y on frame 1
  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      material={mat}
      position={[0, -0.3, 0]}
    />
  );
}

useGLTF.preload("/models/low_poly_bust.glb");

function FallbackSphere() {
  return (
    <mesh>
      <sphereGeometry args={[0.7, 12, 8]} />
      <meshBasicMaterial color="#5fd9c0" wireframe />
    </mesh>
  );
}

function HeadMesh({ active, mouseTarget }: { active: boolean; mouseTarget: React.RefObject<MouseTarget> }) {
  return (
    <Suspense fallback={<FallbackSphere />}>
      <HeadMeshContent active={active} mouseTarget={mouseTarget} />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────
// Canvas export
// hovered: pure mouse-hover — drives the CSS drop-shadow glow only
// active:  hover || focus — drives the GLSL shader animation
// ─────────────────────────────────────────────────────────────────
export function RomanBustR3F({ active, hovered }: { active: boolean; hovered: boolean }) {
  const [canvasReady, setCanvasReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseTargetRef = useRef<MouseTarget>({ rotY: 0, rotX: 0, active: false });

  useEffect(() => {
    const t = setTimeout(() => setCanvasReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Global mouse tracking — head slowly follows cursor when it's within 380px
  useEffect(() => {
    const RANGE = 380;
    const MAX_ROT_Y = 0.45;
    const MAX_ROT_X = 0.20;

    const handleMouse = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < RANGE) {
        mouseTargetRef.current = {
          rotY:   (dx / RANGE) * MAX_ROT_Y,
          rotX:  -(dy / RANGE) * MAX_ROT_X,
          active: true,
        };
      } else {
        mouseTargetRef.current.active = false;
      }
    };

    window.addEventListener("mousemove", handleMouse, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  if (!canvasReady) return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;

  const shadowFilter = hovered
    ? [
        "brightness(1.6) saturate(2.4)",
        "drop-shadow(0 0 3px #ffffff)",
        "drop-shadow(0 0 14px rgb(var(--accent-rgb) / 1.0))",
        "drop-shadow(0 0 38px rgb(var(--accent-rgb) / 0.82))",
        "drop-shadow(0 0 72px rgb(var(--accent-rgb) / 0.52))",
      ].join(" ")
    : "drop-shadow(0 0 0px transparent)";

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 1,
        filter: shadowFilter,
        transition: "filter 380ms ease",
      }}
    >
      <Canvas
        camera={{ position: [0.28, 0.10, 3.0], fov: 52, near: 0.01, far: 100 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <HeadMesh active={active} mouseTarget={mouseTargetRef} />
      </Canvas>
    </div>
  );
}
