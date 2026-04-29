"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const MODEL_URL = "/models/free_pack_tooth.glb";

// ─────────────────────────────────────────────────────────────────
// Per-theme accent palette (drives hover bloom + beam colour)
// ─────────────────────────────────────────────────────────────────
const ACCENT_PALETTES: Record<string, THREE.Color> = {
  terminal:  new THREE.Color(0x5fd9c0),
  blueprint: new THREE.Color(0x4f7dff),
  caution:   new THREE.Color(0xffd24a),
  midnight:  new THREE.Color(0xd6d6dc),
};

function getTheme(): string {
  if (typeof document === "undefined") return "terminal";
  return document.documentElement.getAttribute("data-theme") ?? "terminal";
}

type MouseTarget = { rotY: number; rotX: number; active: boolean };

// ─────────────────────────────────────────────────────────────────
// Tooth shader — white plaster, directional light, CRT scan,
// death-metal hover bloom in theme accent.
// ─────────────────────────────────────────────────────────────────
const TOOTH_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal      = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir     = normalize(cameraPosition - worldPos.xyz);
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TOOTH_FRAG = /* glsl */ `
  uniform float uHoverGlow;
  uniform vec3  uAccent;

  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vec3 N  = normalize(vNormal);
    vec3 Nw = normalize(vWorldNormal);
    vec3 V  = normalize(vViewDir);
    if (dot(N, V) < 0.0) { N = -N; Nw = -Nw; }

    float cosTheta = max(dot(N, V), 0.0);
    float fresnel  = pow(1.0 - cosTheta, 1.6);

    // Plaster tones
    vec3 stone = vec3(0.92, 0.90, 0.85);
    vec3 dark  = vec3(0.16, 0.16, 0.18);

    // Directional lighting
    vec3 keyDir  = normalize(vec3(0.30, 0.70, 1.00));
    vec3 fillDir = normalize(vec3(-0.55, 0.25, 0.80));
    float diff   = max(dot(Nw, keyDir),  0.0);
    float fill   = max(dot(Nw, fillDir), 0.0) * 0.30;

    vec3 col = mix(dark, stone, 0.30 + diff * 0.55 + fill);

    // Edge AO
    float edge = smoothstep(0.05, 0.45, cosTheta);
    col *= 0.32 + 0.68 * edge;

    // Death-metal hover bloom
    float hvr = uHoverGlow;
    col += vec3(0.95, 0.97, 1.0) * hvr * fresnel * 1.1;
    col += uAccent * hvr * (fresnel * 1.5 + 0.30);
    col  = mix(col, uAccent * 2.0, hvr * 0.25 * fresnel);

    // CRT scanlines
    float scan = sin(gl_FragCoord.y * 2.094) * 0.5 + 0.5;
    col *= 0.85 + 0.15 * scan;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────
// Beam shader — additive volumetric cone shooting toward camera.
// Bright at the cone's grazing silhouette + axial fade from apex.
// ─────────────────────────────────────────────────────────────────
const BEAM_VERT = /* glsl */ `
  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vUv      = uv;
    vNormal  = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform vec3  uColor;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vViewDir;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vViewDir);

    // Grazing fresnel — thicker volume at silhouette edges of the cone
    float fres = 1.0 - abs(dot(N, V));
    fres = pow(fres, 1.4);

    // Axial fade — uv.y=1 at apex (mouth source), 0 at base (camera tip)
    float axial = vUv.y;
    float axBoost = pow(axial, 0.5);

    vec3 hot = vec3(1.00, 0.98, 0.92);
    vec3 col = mix(uColor * 1.4, hot, fres * 0.70);

    // Edge core gets bright; centre stays translucent
    float a = (fres * 0.85 + 0.10) * (0.45 + axBoost * 0.55) * uOpacity;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

// ─────────────────────────────────────────────────────────────────
// Real jaw — uses free_pack_tooth.glb (v02 LOD, 1234 tris).
// Source has 4 LOD versions side-by-side: v01, v02, v03, v04 + Text.
// We isolate v02 (SM_UpperJaw_v02 + SM_LowerJaw_v02), hide the rest,
// and override the original Tooth_M material with our stone shader.
// ─────────────────────────────────────────────────────────────────

// Target world size after our normalising scale.
// Set conservatively so the model still fits during mouse-look rotation
// (the X-wide jaw rotates up to ±0.45 rad and grows on screen).
const TARGET_WORLD_SIZE = 1.25;

function RealJaw({
  active,
  mouseTarget,
  beamTrigger,
}: {
  active: boolean;
  mouseTarget: React.RefObject<MouseTarget>;
  beamTrigger: number;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const rootRef  = useRef<THREE.Group>(null);
  const upperRef = useRef<THREE.Object3D | null>(null);
  const lowerRef = useRef<THREE.Object3D | null>(null);

  // Initial node positions (so we can animate by adding deltas without losing the rest pose)
  const initialPosRef = useRef({ upperY: 0, lowerY: 0, upperX: 0, lowerX: 0 });
  // Half the natural gap between upper.y_min and lower.y_max — used to close on bite
  const closeShiftRef = useRef(0);

  const mat = useMemo(() => {
    const c = (ACCENT_PALETTES[getTheme()] ?? ACCENT_PALETTES.terminal).clone();
    return new THREE.ShaderMaterial({
      vertexShader: TOOTH_VERT,
      fragmentShader: TOOTH_FRAG,
      uniforms: {
        uHoverGlow: { value: 0 },
        uAccent:    { value: c },
      },
    });
  }, []);

  // Theme observer keeps accent uniform synced
  useEffect(() => {
    const apply = () => {
      const c = ACCENT_PALETTES[getTheme()] ?? ACCENT_PALETTES.terminal;
      mat.uniforms.uAccent.value.copy(c);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [mat]);

  // Process the GLB scene — find v02 jaws, hide everything else, override material
  const { centerOffset, normScale } = useMemo(() => {
    // Object-wrapped refs so TS keeps the "Object3D | null" type
    // through the traverse callback (otherwise narrows to never).
    const refs: { upper: THREE.Object3D | null; lower: THREE.Object3D | null } = {
      upper: null,
      lower: null,
    };

    scene.traverse((child) => {
      const name = child.name;

      // Hide other LOD versions, tongue, and showcase text labels
      if (name === "Tooth_v01" || name === "Tooth_v03" || name === "Tooth_v04" || name === "Text") {
        child.visible = false;
        return;
      }
      if (name.startsWith("SM_Tongue")) {
        child.visible = false;
        return;
      }

      if (name === "SM_UpperJaw_v02") refs.upper = child;
      if (name === "SM_LowerJaw_v02") refs.lower = child;

      // Override original Tooth_M material with our stone shader
      if (
        child instanceof THREE.Mesh &&
        (name.includes("UpperJaw_v02") || name.includes("LowerJaw_v02"))
      ) {
        child.material = mat;
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
      }
    });

    upperRef.current = refs.upper;
    lowerRef.current = refs.lower;

    if (!refs.upper || !refs.lower) {
      return { centerOffset: new THREE.Vector3(), normScale: 1 };
    }
    const upper = refs.upper;
    const lower = refs.lower;

    // Update world matrices then compute bounding boxes
    scene.updateMatrixWorld(true);
    const upperBox = new THREE.Box3().setFromObject(upper);
    const lowerBox = new THREE.Box3().setFromObject(lower);
    const bbox = new THREE.Box3().union(upperBox).union(lowerBox);

    const center = bbox.getCenter(new THREE.Vector3());
    const size   = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scl    = maxDim > 0 ? TARGET_WORLD_SIZE / maxDim : 1;

    // Natural gap between upper-y-min and lower-y-max (in unscaled GLB units)
    const gap = upperBox.min.y - lowerBox.max.y;
    closeShiftRef.current = Math.max(0, gap * 0.55);

    // Stash original transform so animation deltas can ride on top of rest pose
    initialPosRef.current.upperY = upper.position.y;
    initialPosRef.current.upperX = upper.position.x;
    initialPosRef.current.lowerY = lower.position.y;
    initialPosRef.current.lowerX = lower.position.x;

    return { centerOffset: center.clone().negate(), normScale: scl };
  }, [scene, mat]);

  useFrame(({ clock }) => {
    const root = rootRef.current;
    const upper = upperRef.current;
    const lower = lowerRef.current;
    if (!root || !upper || !lower) return;
    const t = clock.elapsedTime;

    const cs = closeShiftRef.current;
    const init = initialPosRef.current;

    // ── Bite logic (in unscaled GLB units, ride on top of rest pose) ──
    //   Idle: stay at GLB's natural pose (slight dazed gap)
    //   Hover: cycle between fully closed (teeth meet) and wide open
    let upperDy: number;
    let lowerDy: number;
    if (active) {
      const bite    = Math.abs(Math.sin(t * 7.5));   // 0..1
      const openMax = cs * 1.7;
      // bite=0 → close (-cs / +cs);  bite=1 → wide open (+openMax / -openMax)
      upperDy = THREE.MathUtils.lerp(-cs, openMax, bite);
      lowerDy = THREE.MathUtils.lerp( cs, -openMax, bite);
    } else {
      upperDy = 0;
      lowerDy = 0;
    }
    upper.position.y = THREE.MathUtils.lerp(upper.position.y, init.upperY + upperDy, 0.18);
    lower.position.y = THREE.MathUtils.lerp(lower.position.y, init.lowerY + lowerDy, 0.18);

    // ── Horizontal sway (jaw misalignment, also in unscaled units) ──
    const swaySpeed = active ? 6.5 : 0.85;
    const swayAmpL  = active ? 0.32 : 0.18;
    lower.position.x = init.lowerX + Math.sin(t * swaySpeed) * swayAmpL;
    upper.position.x = init.upperX - Math.sin(t * swaySpeed * 0.6) * swayAmpL * 0.45;

    // ── Hover bloom uniform ────────────────────────────────────
    mat.uniforms.uHoverGlow.value = THREE.MathUtils.lerp(
      mat.uniforms.uHoverGlow.value,
      active ? 1.0 : 0.0,
      0.08,
    );

    // ── Mouse-look (rotate the whole jaw assembly) ─────────────
    const mt = mouseTarget.current;
    const idleY = Math.sin(t * 0.4) * 0.07;
    const idleX = Math.sin(t * 0.32) * 0.030;
    const targetY = mt.active ? mt.rotY * 0.55 : idleY;
    const targetX = mt.active ? mt.rotX * 0.55 : idleX;
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, targetY, 0.05);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, targetX, 0.05);
  });

  return (
    <group ref={rootRef}>
      {/* Two nested groups so translate happens BEFORE scale.
          Three.js applies T·S, so v_world = s·v_local + p.
          With nested groups: outer scale wraps inner translate →
          v_world = s · (v_local + p) → places bbox.center at origin. */}
      <group scale={normScale}>
        <group position={centerOffset}>
          <primitive object={scene} />
        </group>
      </group>

      {/* Light-beam burst from mouth on click */}
      <MouthBeam beamTrigger={beamTrigger} />
    </group>
  );
}

// Pre-load so the model is hot when the page hits idle
useGLTF.preload(MODEL_URL);

// Suspense-wrapped so the canvas renders empty while the GLB streams in
function JawWithSuspense(props: {
  active: boolean;
  mouseTarget: React.RefObject<MouseTarget>;
  beamTrigger: number;
}) {
  return (
    <Suspense fallback={null}>
      <RealJaw {...props} />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────
// MouthBeam — additive cone shoots from inside-mouth toward camera.
// Apex is the perspective vanishing-point inside the bite.
// ─────────────────────────────────────────────────────────────────
function MouthBeam({ beamTrigger }: { beamTrigger: number }) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const startRef = useRef(0);
  const liveRef  = useRef(false);

  const mat = useMemo(() => {
    const c = (ACCENT_PALETTES[getTheme()] ?? ACCENT_PALETTES.terminal).clone();
    return new THREE.ShaderMaterial({
      vertexShader:   BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: {
        uOpacity: { value: 0 },
        uColor:   { value: c },
      },
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    });
  }, []);

  // Theme observer keeps beam colour synced
  useEffect(() => {
    const apply = () => {
      const c = ACCENT_PALETTES[getTheme()] ?? ACCENT_PALETTES.terminal;
      mat.uniforms.uColor.value.copy(c);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [mat]);

  // Trigger on click (any non-zero token change)
  useEffect(() => {
    if (beamTrigger > 0) {
      liveRef.current  = true;
      startRef.current = performance.now() / 1000;
    }
  }, [beamTrigger]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!liveRef.current) {
      mesh.scale.set(0.0001, 0.0001, 0.0001);
      mat.uniforms.uOpacity.value = 0;
      return;
    }
    const elapsed = clock.elapsedTime - startRef.current;
    const total = 0.42;
    if (elapsed >= total) {
      liveRef.current = false;
      mesh.scale.set(0.0001, 0.0001, 0.0001);
      mat.uniforms.uOpacity.value = 0;
      return;
    }
    const t = elapsed / total;

    // Phase 1 (0–14%): explosive expand, full opacity
    // Phase 2 (14–28%): hold sustain
    // Phase 3 (28–100%): grow slightly while fading out
    let scale: number;
    let opacity: number;
    if (t < 0.14) {
      const p = t / 0.14;
      scale   = 0.15 + p * 0.85;          // 0.15 → 1.0
      opacity = 1.0;
    } else if (t < 0.28) {
      scale   = 1.0;
      opacity = 1.0;
    } else {
      const p = (t - 0.28) / 0.72;
      scale   = 1.0 + p * 0.18;           // grows slightly
      opacity = Math.max(0, 1 - p * 1.05);
    }
    mesh.scale.set(scale, scale, scale);
    mat.uniforms.uOpacity.value = opacity;
  });

  // Cone default: apex at +Y, base at -Y. Rotate −π/2 around X →
  //   apex at −Z (inside the mouth), base at +Z (toward camera).
  // Translated forward so the apex sits roughly at the bite plane.
  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0.40]}
      rotation={[-Math.PI / 2, 0, 0]}
      material={mat}
      renderOrder={10}
    >
      <coneGeometry args={[0.55, 1.7, 36, 1, true]} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────
// Canvas wrapper — same delayed-mount + drop-shadow trick as bust
// ─────────────────────────────────────────────────────────────────
export function TeethJawR3F({
  active,
  hovered,
  beamTrigger,
}: {
  active: boolean;
  hovered: boolean;
  beamTrigger: number;
}) {
  const [canvasReady, setCanvasReady] = useState(false);
  const containerRef  = useRef<HTMLDivElement>(null);
  const mouseTargetRef = useRef<MouseTarget>({ rotY: 0, rotX: 0, active: false });

  useEffect(() => {
    const id = setTimeout(() => setCanvasReady(true), 150);
    return () => clearTimeout(id);
  }, []);

  // Global mouse-look tracking (within 380px of bust centre)
  useEffect(() => {
    const RANGE = 380;
    const MAX_ROT_Y = 0.45;
    const MAX_ROT_X = 0.20;
    const handle = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
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
    window.addEventListener("mousemove", handle, { passive: true });
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  if (!canvasReady) {
    return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
  }

  // CSS drop-shadow follows the canvas alpha silhouette
  const shadowFilter = hovered
    ? [
        "brightness(1.45) saturate(1.9)",
        "drop-shadow(0 0 3px #ffffff)",
        "drop-shadow(0 0 14px rgb(var(--accent-rgb) / 1.0))",
        "drop-shadow(0 0 36px rgb(var(--accent-rgb) / 0.78))",
        "drop-shadow(0 0 70px rgb(var(--accent-rgb) / 0.48))",
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
        camera={{ position: [0, 0.05, 2.4], fov: 48, near: 0.01, far: 100 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      >
        <JawWithSuspense
          active={active}
          mouseTarget={mouseTargetRef}
          beamTrigger={beamTrigger}
        />
      </Canvas>
    </div>
  );
}
