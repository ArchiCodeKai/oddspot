"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────
// Vertex Shader — mouth-open singing, brow furrow, lip tremble
// vWorldNormal passed to fragment for fixed directional lighting.
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

    // Normalised face height in [-1.2, 1.2] range (calibrated after geometry normalisation)
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

    // Per-face phase hash — each polygon cycles at its own phase
    float facePhase = vPos.x * 4.3 + vPos.y * 3.1 + vPos.z * 1.9;
    float t = uTime * 0.22 + facePhase;

    float r = 0.5 + 0.5 * cos(t * 2.9 + 0.000);
    float g = 0.5 + 0.5 * cos(t * 3.2 + 2.094);
    float b = 0.5 + 0.5 * cos(t * 2.6 + 4.189);

    vec3 cyan   = vec3(0.000, 0.898, 0.800);
    vec3 purple = vec3(0.520, 0.140, 0.900);
    vec3 pearl  = vec3(0.870, 0.930, 1.000);
    vec3 dark   = vec3(0.038, 0.110, 0.130);

    vec3 irid  = mix(mix(cyan, purple, r), pearl, b * 0.38);
    vec3 color = mix(dark, irid, 0.42 + cosTheta * 0.42 + fresnel * 0.50);
    color += cyan * 0.10;

    // ── Directional lighting (world-space, fixed — reveals face anatomy) ──
    // Key: overhead-front (brightens forehead, nose bridge, cheeks)
    // Fill: left-front   (softens opposite-side shadows)
    vec3 keyDir  = normalize(vec3(0.2, 0.70, 1.0));
    vec3 fillDir = normalize(vec3(-0.55, 0.25, 0.80));
    float diff   = max(dot(Nw, keyDir),  0.0);
    float fill   = max(dot(Nw, fillDir), 0.0) * 0.32;
    color *= 0.28 + diff * 0.58 + fill;

    // Hover bloom
    color += cyan * uHoverGlow * fresnel * 0.85;
    color  = mix(color, cyan, uHoverGlow * 0.12 * fresnel);

    // Gentle silhouette darkening
    float edge = smoothstep(0.04, 0.42, cosTheta);
    color *= 0.22 + 0.78 * edge;

    gl_FragColor = vec4(color, 0.95 + edge * 0.05);
  }
`;

// ─────────────────────────────────────────────────────────────────
// Build flat-shaded geometry from a GLTF mesh
// Centers + normalises scale so the head fits in a ±1.2 bounding box.
// ─────────────────────────────────────────────────────────────────
function buildFlatGeo(src: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = src.toNonIndexed();

  // Centre and scale to unit sphere
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 1.2 / (maxDim * 0.5);

  const pos = g.attributes.position.array as Float32Array;
  const len = pos.length;
  for (let i = 0; i < len; i += 3) {
    pos[i]   = (pos[i]   - center.x) * scale;
    pos[i+1] = (pos[i+1] - center.y) * scale;
    pos[i+2] = (pos[i+2] - center.z) * scale;
  }
  g.attributes.position.needsUpdate = true;

  // Recompute per-face (flat) normals
  const norms = new Float32Array(len);
  for (let t = 0; t < len; t += 9) {
    const ax = pos[t],   ay = pos[t+1], az = pos[t+2];
    const bx = pos[t+3], by = pos[t+4], bz = pos[t+5];
    const cx = pos[t+6], cy = pos[t+7], cz = pos[t+8];
    const ex = bx-ax, ey = by-ay, ez = bz-az;
    const fx = cx-ax, fy = cy-ay, fz = cz-az;
    const nx = ey*fz-ez*fy, ny = ez*fx-ex*fz, nz = ex*fy-ey*fx;
    const l  = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
    norms[t]=norms[t+3]=norms[t+6]=nx/l;
    norms[t+1]=norms[t+4]=norms[t+7]=ny/l;
    norms[t+2]=norms[t+5]=norms[t+8]=nz/l;
  }
  g.setAttribute("normal", new THREE.BufferAttribute(norms, 3));

  return g;
}

// ─────────────────────────────────────────────────────────────────
// HeadMeshContent — needs useGLTF (must be inside Suspense)
// ─────────────────────────────────────────────────────────────────
function HeadMeshContent({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { scene } = useGLTF("/models/low_poly_bust.glb");

  // Extract the first mesh geometry and apply full world transform.
  // The Sketchfab GLB has a parent node with a Z-up→Y-up rotation matrix;
  // without applying matrixWorld the geometry stays in original OBJ space
  // (height along Z, face pointing -Y) which makes the camera look at the
  // top of the skull instead of the face.
  const srcGeo = useMemo(() => {
    let found: THREE.BufferGeometry | null = null;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !found) {
        child.updateWorldMatrix(true, false);
        const geo = (child.geometry as THREE.BufferGeometry).clone();
        geo.applyMatrix4(child.matrixWorld);
        found = geo;
      }
    });
    return found;
  }, [scene]);

  const geo = useMemo(() => {
    if (!srcGeo) return new THREE.SphereGeometry(1, 20, 16);
    return buildFlatGeo(srcGeo);
  }, [srcGeo]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
          uTime:       { value: 0 },
          uMouthOpen:  { value: 0.22 },
          uBrowStrain: { value: 0 },
          uTremble:    { value: 0 },
          uHoverGlow:  { value: 0 },
        },
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const u = mat.uniforms;
    u.uTime.value = t;

    const mesh = meshRef.current;
    if (!mesh) return;

    // Gentle float
    mesh.position.y = Math.sin(t * 1.1) * 0.03;

    // Base Y rotation = Math.PI to face the camera after world-transform fix.
    // Idle: subtle sway around face-forward; active: tilt to show profile.
    const targetRotY = active
      ? Math.PI + 0.38 + Math.sin(t * 0.55) * 0.05
      : Math.PI + Math.sin(t * 0.65) * 0.07;
    mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.045;
    mesh.rotation.x = Math.sin(t * 0.82) * 0.016;

    // Mouth: idle = gentle hum; active = wide-open sing
    const targetMouth = active
      ? 0.70 + 0.30 * Math.sin(t * 4.2)
      : 0.20 + 0.16 * Math.sin(t * 1.8);
    u.uMouthOpen.value += (targetMouth - u.uMouthOpen.value) * 0.07;

    const onOff = active ? 1 : 0;
    u.uBrowStrain.value += (onOff - u.uBrowStrain.value) * 0.055;
    u.uTremble.value    += (onOff - u.uTremble.value)    * 0.08;
    u.uHoverGlow.value  += (onOff - u.uHoverGlow.value)  * 0.06;
  });

  return <mesh ref={meshRef} geometry={geo} material={mat} rotation={[0, Math.PI, 0]} />;
}

// Preload so the model is ready before the canvas mounts
useGLTF.preload("/models/low_poly_bust.glb");

// Visible fallback sphere — shows if GLTF hasn't loaded yet
function FallbackSphere() {
  return (
    <mesh>
      <sphereGeometry args={[0.7, 12, 8]} />
      <meshBasicMaterial color="#5fd9c0" wireframe />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
// HeadMesh — wraps content in Suspense
// ─────────────────────────────────────────────────────────────────
function HeadMesh({ active }: { active: boolean }) {
  return (
    <Suspense fallback={<FallbackSphere />}>
      <HeadMeshContent active={active} />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────
// Canvas export
// Camera: slightly right of centre, shows nose profile against bg.
// ─────────────────────────────────────────────────────────────────
export function RomanBustR3F({ active }: { active: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <Canvas
        camera={{ position: [0.28, 0.10, 2.8], fov: 46, near: 0.01, far: 100 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <HeadMesh active={active} />
      </Canvas>
    </div>
  );
}
