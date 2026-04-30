"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useJawMoonStore } from "@/store/useJawMoonStore";

const MODEL_URL = "/models/free_pack_tooth.glb";

// Moon → jaw bite trigger: fire when moon enters this many viewport pixels
// of the jaw container's centre.
const MOON_BITE_RANGE_PX = 260;
// Cooldown depends on what the moon is doing:
//   "orbiting" — auto flyby, jaw wants more snaps  → 1.0s
//   "returning" — moon springing back to orbit     → 1.4s
//   "grabbed" — user is dragging it, less spammy   → 2.5s
const MOON_BITE_COOLDOWN_ORBITING = 1.0;
const MOON_BITE_COOLDOWN_RETURN   = 1.4;
const MOON_BITE_COOLDOWN_GRABBED  = 2.5;
// Soft-tracking range (head turns toward the moon when within this radius).
// Bumped 750 → 1400 because the LangPortal sits at top:7%/right:4%, so the
// moon is almost always > 750px away. With 1400 the head reacts to most
// orbital positions as well as anywhere a user drags the moon to.
const MOON_TRACK_RANGE_PX = 1400;
// How fast the head lerps toward target rotation per frame.
const HEAD_TRACK_LERP = 0.22;
// Head tilt during bite — barely perceptible (≈2°). Just enough to register
// "facing the prey" without rotating the whole head assembly.
const BITE_HEAD_TILT = 0.04;

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

// Clamshell motion model (radian angles + lunge magnitudes in GLB local units)
type JawAnimationMetrics = {
  /** Negative-direction angle for biting overlap. Front teeth interpenetrate. */
  closeAngle: number;
  /** Lower bound of idle breathing — always slightly open (in radians). */
  idleMinAng: number;
  /** Upper bound of idle breathing. */
  idleMaxAng: number;
  /** Hover wide-open peak (jaws hinge open at the front). */
  hoverMaxAng: number;
  /** Click wide-open peak. */
  clickMaxAng: number;
  /** Position thrust along moon's screen direction during bite (X+Y). */
  lungeXY: number;
  /** Position thrust along forward axis (toward camera) during bite/click. */
  lungeFwd: number;
  /** Natural rest-pose gap between upper.y_min and lower.y_max — used as the
   *  closure translation magnitude so back AND front fully close on bite. */
  naturalGap: number;
};

type JawSetup = {
  upper: THREE.Object3D | null;
  lower: THREE.Object3D | null;
  centerOffset: THREE.Vector3;
  normScale: number;
  beamOrigin: THREE.Vector3;
  initialUpper: THREE.Vector3;
  initialLower: THREE.Vector3;
  /** Initial euler.x of each jaw — we add our open angle to this so any baked
   *  FBX rotation is preserved instead of overwritten. */
  initialUpperRotX: number;
  initialLowerRotX: number;
  localUp: THREE.Vector3;
  localFwd: THREE.Vector3;
  /** World +X expressed in parent-local — used for moon-direction lunge. */
  localRight: THREE.Vector3;
  /** Hinge point in parent-local space — back-centre of the bite plane.
   *  Both jaws rotate around this point in clamshell motion. */
  hinge: THREE.Vector3;
  anim: JawAnimationMetrics;
};

// ─────────────────────────────────────────────────────────────────
// Tooth shader — white plaster, directional light, CRT scan,
// death-metal hover bloom in theme accent.
// ─────────────────────────────────────────────────────────────────
const TOOTH_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos    = worldPos.xyz;
    vNormal      = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir     = normalize(cameraPosition - worldPos.xyz);
    gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Acid-graphic stone — flat-normal cel + halftone dots + accent rim
const TOOTH_FRAG = /* glsl */ `
  uniform float uHoverGlow;
  uniform vec3  uAccent;

  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    // Flat (face) normal computed from screen-space position derivatives —
    // gives per-triangle shading even though the GLB has smooth vertex normals,
    // so polygon edges become visible and the model reads as low-poly graphic.
    vec3 flatN = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));

    vec3 N  = normalize(vNormal);
    vec3 Nw = normalize(vWorldNormal);
    vec3 V  = normalize(vViewDir);
    if (dot(N, V) < 0.0)     { N = -N; Nw = -Nw; }
    if (dot(flatN, V) < 0.0) { flatN = -flatN; }

    float cosTheta = max(dot(N, V), 0.0);
    float fresnel  = pow(1.0 - cosTheta, 1.5);

    // Directional lighting on FLAT normal → per-triangle banding
    vec3 keyDir  = normalize(vec3( 0.40, 0.78, 1.00));
    vec3 fillDir = normalize(vec3(-0.55, 0.30, 0.85));
    float diff   = max(dot(flatN, keyDir),  0.0);
    float fill   = max(dot(flatN, fillDir), 0.0) * 0.30;
    float lighting = diff * 0.70 + fill;

    // 4-step HIGH CONTRAST posterize → 0.06 / 0.30 / 0.60 / 0.96
    float lit = 0.06
              + step(0.20, lighting) * 0.24
              + step(0.45, lighting) * 0.30
              + step(0.70, lighting) * 0.36;

    // Bone-white to ink-black palette (extreme contrast)
    vec3 ink   = vec3(0.04, 0.04, 0.06);
    vec3 stone = vec3(0.97, 0.94, 0.86);
    vec3 col   = mix(ink, stone, lit);

    // Big halftone dots — 8px grid, very visible in shadow
    vec2  hp        = gl_FragCoord.xy;
    vec2  cell      = mod(hp, 8.0) - 4.0;
    float cellDist  = length(cell);
    float darkness  = 1.0 - lit;
    float dotRadius = darkness * 3.6 + 0.4;
    float dots      = step(cellDist, dotRadius);
    col = mix(col, ink, dots * 0.72);

    // Diagonal cross-hatching in shadow areas (ink-illustration feel)
    float h1 = step(0.55, sin((hp.x + hp.y) * 0.42) * 0.5 + 0.5);
    float h2 = step(0.55, sin((hp.x - hp.y) * 0.42) * 0.5 + 0.5);
    float shadowMask = 1.0 - smoothstep(0.10, 0.50, lit);
    col = mix(col, ink, h1 * shadowMask * 0.40);
    // Heavier double-hatch only in deepest shadow (lit < 0.15)
    float deepShadow = 1.0 - smoothstep(0.0, 0.18, lit);
    col = mix(col, ink, h2 * deepShadow * 0.55);

    // Scratchy noise across the surface
    float n = fract(sin(dot(floor(hp / 1.5), vec2(127.1, 311.7))) * 43758.5453);
    col *= 0.92 + n * 0.16;

    // STRONG silhouette outline — pure accent
    float rim = smoothstep(0.55, 0.92, fresnel);
    col = mix(col, uAccent * 1.6, rim * 0.85);

    // Death-metal hover bloom
    float hvr = uHoverGlow;
    col += vec3(0.95, 0.97, 1.0) * hvr * fresnel * 1.2;
    col += uAccent * hvr * (fresnel * 1.6 + 0.32);
    col  = mix(col, uAccent * 2.5, hvr * 0.30 * fresnel);

    // CRT scanlines
    float scan = sin(gl_FragCoord.y * 2.094) * 0.5 + 0.5;
    col *= 0.88 + 0.12 * scan;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────
// Beam shader — additive volumetric cone shooting toward camera.
// Bright at the cone's grazing silhouette + axial fade from apex.
// ─────────────────────────────────────────────────────────────────
const BEAM_VERT = /* glsl */ `
  varying vec2  vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uProgress;
  uniform vec3  uColor;

  varying vec2  vUv;

  void main() {
    float along = clamp(vUv.y, 0.0, 1.0);
    float face  = abs(fract(vUv.x) - 0.5) * 2.0;
    float core  = 1.0 - smoothstep(0.12, 0.92, face);

    float mouthFade = smoothstep(0.0, 0.10, along);
    float endFade   = 1.0 - smoothstep(0.72, 1.0, along);
    float streak    = 0.70 + 0.30 * smoothstep(
      0.24,
      0.0,
      abs(fract((along - uProgress * 1.7) * 5.0) - 0.5)
    );

    vec3 white = vec3(1.0);
    vec3 tint  = uColor * 0.30 + vec3(0.70);
    vec3 col   = mix(tint, white, core * 0.85);
    float a    = (0.16 + core * 0.68) * mouthFade * endFade * streak * uOpacity;

    gl_FragColor = vec4(col, clamp(a, 0.0, 0.92));
  }
`;

// ─────────────────────────────────────────────────────────────────
// Real jaw — uses free_pack_tooth.glb (v02 LOD, 1234 tris).
// Source has 4 LOD versions side-by-side: v01, v02, v03, v04 + Text.
// We isolate v02 (SM_UpperJaw_v02 + SM_LowerJaw_v02), hide the rest,
// and override the original Tooth_M material with our stone shader.
// ─────────────────────────────────────────────────────────────────

// Target world size for the animated envelope, not just the rest-pose bbox.
const TARGET_WORLD_SIZE = 1.35;
const ANIMATION_FRAMING_MARGIN = 1.15;
// No lateral offset — keep the model centred in the canvas.
const RIGHT_OFFSET = 0;

function getMeshBoxInParentSpace(object: THREE.Object3D, parent: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const worldToParent = parent.matrixWorld.clone().invert();
  const point = new THREE.Vector3();

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const { geometry } = child;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const geometryBox = geometry.boundingBox;
    if (!geometryBox) return;

    const { min, max } = geometryBox;
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          point.set(x, y, z).applyMatrix4(child.matrixWorld).applyMatrix4(worldToParent);
          box.expandByPoint(point);
        }
      }
    }
  });

  return box;
}

function RealJaw({
  active,
  mouseTarget,
  beamTrigger,
  clickJawTrigger,
  domContainerRef,
  domRectRef,
}: {
  active: boolean;
  mouseTarget: React.RefObject<MouseTarget>;
  beamTrigger: number;
  clickJawTrigger: number;
  domContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Cached container rect — 從上層用 ResizeObserver / scroll listener 維護
   *  避免每幀呼叫 getBoundingClientRect()（會強制 layout flush，引發 reflow） */
  domRectRef: React.RefObject<DOMRect | null>;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const rootRef  = useRef<THREE.Group>(null);

  // Click jaw-snap-open animation state (clock-time based)
  const jawSnapRef = useRef<{ start: number; live: boolean }>({ start: 0, live: false });
  // Trigger flag — bridges from useEffect (no clock) to useFrame (has clock)
  const jawSnapPendingRef = useRef(false);

  // ── Moon-lunge state ────────────────────────────────────────────────
  // When moon enters proximity, snap a one-shot bite oriented toward it.
  // Cooldown debounces repeated bites while moon lingers nearby.
  const moonBiteRef = useRef<{
    start: number;       // clock time the bite started
    live: boolean;       // currently animating
    dirX: number;        // unit vector toward moon (screen-space, normalised)
    dirY: number;
    lastTriggered: number; // clock time of last trigger (for cooldown)
  }>({ start: 0, live: false, dirX: 0, dirY: 0, lastTriggered: -999 });

  // Reusable scratch vectors so useFrame allocates nothing per-frame
  const tmpUpperTarget = useRef(new THREE.Vector3());
  const tmpLowerTarget = useRef(new THREE.Vector3());
  // Scratch for clamshell hinge position correction
  const tmpRotatedHinge = useRef(new THREE.Vector3());
  const tmpEulerScratch = useRef(new THREE.Euler());
  // Mouth-outer world position projected to viewport pixels — recomputed each
  // frame so head-tracking always uses the actual visible mouth as anchor,
  // not the canvas container centre. This is the lock that makes the line
  // [moon centre · mouth outer · mouth inner] stay collinear when tracking.
  const mouthWorldRef = useRef(new THREE.Vector3());
  const { camera: jawCamera } = useThree();

  useEffect(() => {
    if (clickJawTrigger > 0) jawSnapPendingRef.current = true;
  }, [clickJawTrigger]);

  const mat = useMemo(() => {
    const c = (ACCENT_PALETTES[getTheme()] ?? ACCENT_PALETTES.terminal).clone();
    // dFdx/dFdy are core in WebGL2 (R3F default) — no extension flag needed
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
  const jawSetup = useMemo<JawSetup>(() => {
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

    if (!refs.upper || !refs.lower) {
      return {
        upper: null,
        lower: null,
        centerOffset: new THREE.Vector3(),
        normScale: 1,
        beamOrigin: new THREE.Vector3(),
        initialUpper: new THREE.Vector3(),
        initialLower: new THREE.Vector3(),
        initialUpperRotX: 0,
        initialLowerRotX: 0,
        localUp: new THREE.Vector3(0, 1, 0),
        localFwd: new THREE.Vector3(0, 0, 1),
        localRight: new THREE.Vector3(1, 0, 0),
        hinge: new THREE.Vector3(),
        anim: {
          closeAngle: 0, idleMinAng: 0, idleMaxAng: 0,
          hoverMaxAng: 0, clickMaxAng: 0, lungeXY: 0, lungeFwd: 0,
          naturalGap: 0,
        },
      };
    }
    const upper = refs.upper;
    const lower = refs.lower;
    const parentNode = upper.parent;

    // Update world matrices then compute bounding boxes
    scene.updateMatrixWorld(true);
    const upperBox = new THREE.Box3().setFromObject(upper);
    const lowerBox = new THREE.Box3().setFromObject(lower);
    const bbox = new THREE.Box3().union(upperBox).union(lowerBox);

    const center = bbox.getCenter(new THREE.Vector3());

    let scl = 1;
    let mouthOrigin = new THREE.Vector3();
    let anim: JawAnimationMetrics = {
      closeAngle: 0, idleMinAng: 0, idleMaxAng: 0,
      hoverMaxAng: 0, clickMaxAng: 0, lungeXY: 0, lungeFwd: 0,
      naturalGap: 0,
    };
    let localUpVec = new THREE.Vector3(0, 1, 0);
    let localFwdVec = new THREE.Vector3(0, 0, 1);

    if (parentNode) {
      const upperLocalBox = getMeshBoxInParentSpace(upper, parentNode);
      const lowerLocalBox = getMeshBoxInParentSpace(lower, parentNode);
      const localBbox = new THREE.Box3().union(upperLocalBox).union(lowerLocalBox);

      const localSize = localBbox.getSize(new THREE.Vector3());
      const gap       = Math.max(0, upperLocalBox.min.y - lowerLocalBox.max.y);
      const upperHt   = upperLocalBox.max.y - upperLocalBox.min.y;
      const lowerHt   = lowerLocalBox.max.y - lowerLocalBox.min.y;
      const jawHeight = upperHt + lowerHt;
      const jawDepth  = localBbox.max.z - localBbox.min.z;

      // ── Clamshell magnitudes (radians for angles, GLB units for lunge) ──
      // Lever arm from hinge to front teeth ≈ jawDepth ≈ 8.14 GLB units, so:
      //   0.50 rad rotation lifts the front by tan(0.50)*8.14 ≈ 4.45 units
      //   that's the hover wide-open peak (ample but framed safely)
      const magnitudes: JawAnimationMetrics = {
        closeAngle:  0.04,                 // small rotation overlap at front
        idleMinAng:  0.04,
        idleMaxAng:  0.10,
        hoverMaxAng: 0.50,
        clickMaxAng: 0.65,
        // Body lunge — barely a nudge so the strike doesn't fling the head.
        lungeXY:     jawHeight * 0.0025,
        lungeFwd:    jawDepth  * 0.005,
        // Stored so useFrame can apply a closure translation that brings the
        // BACK of the jaw fully shut (rotation alone only closes the front).
        naturalGap:  gap,
      };
      anim = magnitudes;

      const parentScale = new THREE.Vector3();
      parentNode.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), parentScale);
      const localToSceneScale = Math.max(
        Math.abs(parentScale.x),
        Math.abs(parentScale.y),
        Math.abs(parentScale.z),
      );
      // Estimate the YZ swept envelope when jaws are at clickMaxAng:
      //   Δy_front = sin(angle) * jawDepth + jawHeight  (jaw sweeps an arc)
      // Approximate with a generous bound rather than full trig.
      const sweepY = jawHeight + Math.sin(magnitudes.clickMaxAng) * jawDepth * 1.1;
      const sweepZ = localSize.z + magnitudes.lungeFwd;
      const animatedMaxDim = Math.max(localSize.x, sweepY, sweepZ);
      const animatedSceneMaxDim = animatedMaxDim * localToSceneScale * ANIMATION_FRAMING_MARGIN;
      scl = animatedSceneMaxDim > 0 ? TARGET_WORLD_SIZE / animatedSceneMaxDim : 1;

      const mouthLocal = new THREE.Vector3(
        (localBbox.min.x + localBbox.max.x) * 0.5,
        (lowerLocalBox.max.y + upperLocalBox.min.y) * 0.5,
        localBbox.max.z,
      );
      const mouthScene = mouthLocal.applyMatrix4(parentNode.matrixWorld);
      mouthOrigin = mouthScene.add(center.clone().negate()).multiplyScalar(scl);
      mouthOrigin.z += 0.015;
    } else {
      const size   = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      scl = maxDim > 0 ? TARGET_WORLD_SIZE / (maxDim * ANIMATION_FRAMING_MARGIN) : 1;
    }

    // Compute the local-space directions that correspond to WORLD up/right/fwd.
    // Both upper and lower share the same parent (Tooth_v02), so one
    // computation is enough.
    let localRightVec = new THREE.Vector3(1, 0, 0);
    if (parentNode) {
      const parentQuat = new THREE.Quaternion();
      parentNode.getWorldQuaternion(parentQuat);
      const inv = parentQuat.clone().invert();
      localUpVec    = new THREE.Vector3(0, 1, 0).applyQuaternion(inv).normalize();
      localFwdVec   = new THREE.Vector3(0, 0, 1).applyQuaternion(inv).normalize();
      localRightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(inv).normalize();
    }

    // ── Hinge point in parent-local space ───────────────────────────
    // Back-centre of the bite plane: x = jaw lateral centre, y = bite line,
    // z = the rear-most edge of either jaw. This is where both jaws pivot.
    let hingePoint = new THREE.Vector3();
    if (parentNode) {
      const upperLocalBox = getMeshBoxInParentSpace(upper, parentNode);
      const lowerLocalBox = getMeshBoxInParentSpace(lower, parentNode);
      hingePoint = new THREE.Vector3(
        (upperLocalBox.min.x + upperLocalBox.max.x +
         lowerLocalBox.min.x + lowerLocalBox.max.x) * 0.25,
        (upperLocalBox.min.y + lowerLocalBox.max.y) * 0.5,
        Math.min(upperLocalBox.min.z, lowerLocalBox.min.z),
      );
    }

    return {
      upper,
      lower,
      centerOffset: center.clone().negate(),
      normScale: scl,
      beamOrigin: mouthOrigin,
      initialUpper: upper.position.clone(),
      initialLower: lower.position.clone(),
      initialUpperRotX: upper.rotation.x,
      initialLowerRotX: lower.rotation.x,
      localUp: localUpVec,
      localFwd: localFwdVec,
      localRight: localRightVec,
      hinge: hingePoint,
      anim,
    };
  }, [scene, mat]);

  const { centerOffset, normScale } = jawSetup;
  // beamOrigin is computed in jawSetup and still available on the object —
  // when MouthBeam is re-enabled below, just destructure it again.

  useFrame(({ clock }) => {
    const root = rootRef.current;
    const { upper, lower } = jawSetup;
    if (!root || !upper || !lower) return;
    const t = clock.elapsedTime;

    const a = jawSetup.anim;

    // ── Latch click trigger to clock time on first frame after click ──
    if (jawSnapPendingRef.current) {
      jawSnapRef.current = { start: t, live: true };
      jawSnapPendingRef.current = false;
    }

    // ── Clamshell motion model ──────────────────────────────────────
    // ONE open angle drives both jaws (upper rotates -angle, lower +angle)
    // around the hinge at the BACK of the bite plane. Front of jaw swings
    // open dramatically; back stays put — exactly like a real jaw / clam.
    //
    //   openAngle > 0  →  mouth opens (idle / hover open / click open)
    //   openAngle < 0  →  bite overlap (front teeth interpenetrate)
    //
    // Lunge offsets are independent translations layered on top of rotation,
    // used during moon-bite (toward moon) and click (forward thrust).
    let openAngle  = 0;
    let lungeUp    = 0;   // along world UP    (signed)
    let lungeRight = 0;   // along world RIGHT
    let lungeFwd   = 0;   // along world FORWARD (toward camera)
    let biteRotY   = 0;   // head yaw toward moon (during bite strike)
    let biteRotX   = 0;   // head pitch toward moon
    let snapping   = false;
    let lerpSpeed  = 0.30;

    // ── CLICK SNAP — Max open · 1.5s hold · then ease back ──────────
    if (jawSnapRef.current.live) {
      const e = t - jawSnapRef.current.start;
      const total = 2.0;
      if (e < total) {
        snapping = true;
        const u = e / total;
        let open: number;
        if (u < 0.04)      open = u / 0.04;
        else if (u < 0.82) open = 1.0;
        else               open = 1.0 - (u - 0.82) / 0.18;
        openAngle = a.clickMaxAng * open;
        lungeFwd  = a.lungeFwd * open;
        lerpSpeed = 0.55;
      } else {
        jawSnapRef.current.live = false;
      }
    }

    // ── MOON LUNGE BITE — multi-axis predatory snap toward moon ─────
    // wind-up (0–25%): open mouth, retreat
    // strike  (25–40%): snap shut into bite-overlap, lunge toward moon
    // recover (40–100%): ease back to neutral
    if (!snapping && moonBiteRef.current.live) {
      const e = t - moonBiteRef.current.start;
      const total = 0.62;
      if (e < total) {
        snapping = true;
        const u = e / total;
        const dirX = moonBiteRef.current.dirX;
        const dirY = moonBiteRef.current.dirY;

        // Reduced wind-up open from 0.85× to 0.40× hoverMax so the bite
        // doesn't yawn out beyond the model's rest-pose silhouette.
        const WIND_UP_OPEN = a.hoverMaxAng * 0.40;
        let strikeAmount: number;
        if (u < 0.25) {
          const p = u / 0.25;
          openAngle    = WIND_UP_OPEN * p;
          strikeAmount = -0.20 * p;          // smaller retreat too
        } else if (u < 0.40) {
          const p = (u - 0.25) / 0.15;
          openAngle    = THREE.MathUtils.lerp(WIND_UP_OPEN, -a.closeAngle, p);
          strikeAmount = THREE.MathUtils.lerp(-0.20, 1.0, p);
        } else {
          const p = (u - 0.40) / 0.60;
          openAngle    = -a.closeAngle * (1 - p);
          strikeAmount = 1 - Math.pow(p, 1.4);
        }

        lungeRight =  dirX * a.lungeXY  * strikeAmount;
        lungeUp    = -dirY * a.lungeXY  * strikeAmount;
        lungeFwd   =        a.lungeFwd  * strikeAmount;
        biteRotY   =  dirX * BITE_HEAD_TILT       * strikeAmount;
        biteRotX   = -dirY * BITE_HEAD_TILT * 0.8 * strikeAmount;
        lerpSpeed = 0.55;
      } else {
        moonBiteRef.current.live = false;
      }
    }

    if (!snapping) {
      if (active) {
        // Hover — aggressive bite cycle. phase=0 closed-overlap, phase=1 wide open.
        const phase = Math.abs(Math.sin(t * 15.0));
        openAngle = THREE.MathUtils.lerp(-a.closeAngle, a.hoverMaxAng, phase);
      } else {
        // Idle — slight breathing, never closes (always between idleMin & idleMax)
        const breathe = (Math.sin(t * 1.4) + 1) * 0.5;
        openAngle = a.idleMinAng + breathe * (a.idleMaxAng - a.idleMinAng);
      }
    }

    // ── Apply clamshell rotation + hinge-fixed position correction ──
    // Rotate each jaw around its local X axis, then shift its position so
    // the HINGE point stays anchored. Math:
    //     v_after  = R(θ) · v_before + position
    //   for v_before = hinge to remain at hinge after rotation:
    //     position = hinge − R(θ) · hinge
    const hingeLocal   = jawSetup.hinge;
    const localUpVec   = jawSetup.localUp;
    const localFwdVec  = jawSetup.localFwd;
    const localRightV  = jawSetup.localRight;

    // Lerp the rotation angle so hover / state transitions are smooth.
    const targetUpperRot = jawSetup.initialUpperRotX - openAngle;
    const targetLowerRot = jawSetup.initialLowerRotX + openAngle;
    upper.rotation.x = THREE.MathUtils.lerp(upper.rotation.x, targetUpperRot, lerpSpeed);
    lower.rotation.x = THREE.MathUtils.lerp(lower.rotation.x, targetLowerRot, lerpSpeed);

    // Hinge correction — based on the *lerped* rotation, so the pin stays
    // exact even when rotation is smoothing toward target.
    tmpEulerScratch.current.copy(upper.rotation);
    tmpRotatedHinge.current.copy(hingeLocal).applyEuler(tmpEulerScratch.current);
    tmpUpperTarget.current.copy(hingeLocal).sub(tmpRotatedHinge.current);

    tmpEulerScratch.current.copy(lower.rotation);
    tmpRotatedHinge.current.copy(hingeLocal).applyEuler(tmpEulerScratch.current);
    tmpLowerTarget.current.copy(hingeLocal).sub(tmpRotatedHinge.current);

    // ── Closure translation (only when angle is negative = closing) ──
    // Pure rotation around the back hinge can only close the FRONT of the
    // jaw — the back stays at its rest gap. To make BOTH ends fully meet
    // when "closed", we translate each jaw toward the bite line by half the
    // natural gap, scaled by how close we are to closeAngle.
    const closeFraction = openAngle < 0
      ? Math.min(1, -openAngle / a.closeAngle)
      : 0;
    const closureT = a.naturalGap * 0.5 * closeFraction;
    tmpUpperTarget.current.addScaledVector(localUpVec, -closureT); // upper down
    tmpLowerTarget.current.addScaledVector(localUpVec,  closureT); // lower up

    // Apply position directly — rotation lerp + closure translation already
    // smooth the motion, and direct copy keeps the hinge anchor exact.
    // Whole-assembly lunge is handled by root.position below (separately).
    void localRightV; void localFwdVec;  // referenced via lunge on root only
    upper.position.copy(tmpUpperTarget.current);
    lower.position.copy(tmpLowerTarget.current);

    // ── Compute the mouth-outer screen pixel position ─────────────
    // Conceptually: the line [moon centre · mouth-outer · mouth-inner] should
    // stay collinear when the jaw is "looking at" the moon. Mouth-inner is
    // the perspective vanishing point inside the throat; mouth-outer is the
    // visible lip plane. Both lie on the head's forward axis. So orienting
    // mouth-outer toward the moon guarantees the whole line is collinear.
    //
    // We do this by projecting beamOrigin (= mouth-outer in rootRef-local
    // coords) through the jaw camera each frame, then converting NDC →
    // viewport pixels using the canvas DOM rect.  After this transform the
    // mouth's pixel position can be compared 1:1 to ms.moonScreenX/Y.
    let mouthScreenX = Number.NaN;
    let mouthScreenY = Number.NaN;
    // 改動前：每幀 dom.getBoundingClientRect() → 強制 layout flush
    //         在有 grain + scanlines + DOM stickers 時引發 reflow，每幀 0.3-1ms 浪費
    // 改動後：讀上層 ResizeObserver/scroll 維護的 cached rect (0 cost)
    //         Landing 是 fixed 全屏不滾動，cache 命中率 ~100%
    const rect = domRectRef.current;
    if (rect && domContainerRef.current) {
      const mouthWorld = mouthWorldRef.current;
      // root.matrix may be stale this frame (rotation/position were just
      // mutated above); updateMatrix() recomposes from the latest local TRS.
      root.updateMatrix();
      mouthWorld.copy(jawSetup.beamOrigin).applyMatrix4(root.matrix);
      mouthWorld.project(jawCamera); // → NDC ∈ [-1, 1]
      mouthScreenX = rect.left + (mouthWorld.x * 0.5 + 0.5) * rect.width;
      mouthScreenY = rect.top  + (-mouthWorld.y * 0.5 + 0.5) * rect.height;
    }

    // ── Moon → mouth-outer screen-space tracking + bite trigger ──
    let moonLookX = 0;
    let moonLookY = 0;
    const ms = useJawMoonStore.getState();
    if (
      Number.isFinite(mouthScreenX) &&
      Number.isFinite(mouthScreenY) &&
      Number.isFinite(ms.moonScreenX) &&
      Number.isFinite(ms.moonScreenY)
    ) {
      const dx = ms.moonScreenX - mouthScreenX;
      const dy = ms.moonScreenY - mouthScreenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximityLin = Math.max(0, 1 - dist / MOON_TRACK_RANGE_PX);
      const proximity    = Math.sqrt(proximityLin); // gentler falloff than linear
      if (proximity > 0) {
        const inv = 1 / Math.max(dist, 1);
        const dxN = dx * inv;
        const dyN = dy * inv;
        // Sign mapping (verified vs existing mouse-look):
        //   dx > 0  (moon to the right of mouth)         → +rotation.y (yaw right)
        //   dy < 0  (moon above mouth in viewport)       → +rotation.x (tilt up)
        moonLookY =  dxN * 0.85 * proximity;
        moonLookX = -dyN * 0.65 * proximity;
      }

      // Bite trigger — distance is now mouth-outer to moon centre, which is
      // a far better proxy for "moon close to the inner vanishing point"
      // than the canvas container centre we used before.
      if (
        dist < MOON_BITE_RANGE_PX &&
        !moonBiteRef.current.live &&
        !snapping
      ) {
        const cooldown =
          ms.moonState === "grabbed"   ? MOON_BITE_COOLDOWN_GRABBED   :
          ms.moonState === "returning" ? MOON_BITE_COOLDOWN_RETURN    :
                                         MOON_BITE_COOLDOWN_ORBITING;
        if (t - moonBiteRef.current.lastTriggered > cooldown) {
          const inv = 1 / Math.max(dist, 1);
          moonBiteRef.current = {
            start: t,
            live: true,
            dirX: dx * inv,
            dirY: dy * inv,
            lastTriggered: t,
          };
        }
      }
    }

    // ── Mouse-look + idle wobble + moon-look + bite composite ───
    // The bite head-tilt overrides during strike, but tracking continues
    // when there is no active bite.  Lerp speeds bumped 0.05 → 0.18 so the
    // head visibly snaps toward the moon as it sweeps past.
    const mt = mouseTarget.current;
    const idleY = Math.sin(t * 0.4) * 0.06;
    const idleX = Math.sin(t * 0.32) * 0.025;
    const baseY = mt.active ? mt.rotY * 0.40 : idleY;
    const baseX = mt.active ? mt.rotX * 0.40 : idleX;
    const targetY = THREE.MathUtils.clamp(baseY + moonLookY + biteRotY, -0.85, 0.85);
    const targetX = THREE.MathUtils.clamp(baseX + moonLookX + biteRotX, -0.55, 0.55);
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, targetY, HEAD_TRACK_LERP);
    root.rotation.x = THREE.MathUtils.lerp(root.rotation.x, targetX, HEAD_TRACK_LERP);

    // Body lunge — applied on top of the static bottom-right shift.
    // RIGHT_OFFSET stays as the resting X anchor; bite adds extra X/Y/Z.
    // Body lunge — the whole jaw assembly translates toward the moon during
    // bite (bite phase only contributes; idle/hover/click contribute mostly fwd).
    // Multiplied by normScale because lungeXY/Fwd are in GLB-native units, but
    // root.position is in the rootRef's parent space (already scaled wrap).
    const ns = jawSetup.normScale;
    root.position.x = THREE.MathUtils.lerp(root.position.x, RIGHT_OFFSET + lungeRight * ns, 0.4);
    root.position.y = THREE.MathUtils.lerp(root.position.y, lungeUp                  * ns, 0.4);
    root.position.z = THREE.MathUtils.lerp(root.position.z, lungeFwd                 * ns, 0.4);
  });

  return (
    <group ref={rootRef} position={[RIGHT_OFFSET, 0, 0]}>
      {/* Two nested groups so translate happens BEFORE scale.
          Three.js applies T·S, so v_world = s·v_local + p.
          With nested groups: outer scale wraps inner translate →
          v_world = s · (v_local + p) → places bbox.center at origin. */}
      <group scale={normScale}>
        <group position={centerOffset}>
          <primitive object={scene} />
        </group>
      </group>

      {/* Beam visual disabled — click feedback is now jaw-only (1.5s hold).
          Keep the prop chain so trigger token still flows without rendering
          the cone, and we can re-enable later by uncommenting the line below. */}
      {/* <MouthBeam beamTrigger={beamTrigger} origin={beamOrigin} /> */}
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
  clickJawTrigger: number;
  domContainerRef: React.RefObject<HTMLDivElement | null>;
  domRectRef: React.RefObject<DOMRect | null>;
}) {
  return (
    <Suspense fallback={null}>
      <RealJaw {...props} />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────
// MouthBeam — additive four-sided frustum anchored inside the mouth.
// The mouth end stays narrow while the front end expands toward camera.
// ─────────────────────────────────────────────────────────────────
function MouthBeam({ beamTrigger, origin }: { beamTrigger: number; origin: THREE.Vector3 }) {
  const meshRef    = useRef<THREE.Mesh>(null);
  const startRef   = useRef(0);
  const liveRef    = useRef(false);
  // Pending flag bridges useEffect (no clock) → useFrame (has clock).
  // Without this we'd be mixing performance.now() with clock.elapsedTime,
  // which have different origins → off-by-some-ms timing drift.
  const pendingRef = useRef(false);

  const mat = useMemo(() => {
    const c = (ACCENT_PALETTES[getTheme()] ?? ACCENT_PALETTES.terminal).clone();
    return new THREE.ShaderMaterial({
      vertexShader:   BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: {
        uOpacity:  { value: 0 },
        uProgress: { value: 0 },
        uColor:    { value: c },
      },
      transparent: true,
      depthWrite:  false,
      depthTest:   false,
      blending:    THREE.AdditiveBlending,
      side:        THREE.DoubleSide,
    });
  }, []);

  const beamGeometry = useMemo(() => {
    const length = 1.55;
    const geometry = new THREE.CylinderGeometry(0.34, 0.018, length, 4, 1, true);
    geometry.translate(0, length * 0.5, 0);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);

  useEffect(() => () => beamGeometry.dispose(), [beamGeometry]);

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

  // Trigger on click (any non-zero token change) — defer the actual start
  // time to the next useFrame so we can use clock.elapsedTime as the basis.
  useEffect(() => {
    if (beamTrigger > 0) pendingRef.current = true;
  }, [beamTrigger]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Latch the click trigger to clock-time on the first frame after click
    if (pendingRef.current) {
      liveRef.current  = true;
      startRef.current = clock.elapsedTime;
      pendingRef.current = false;
    }

    if (!liveRef.current) {
      mesh.visible = false;
      mesh.scale.set(0.0001, 0.0001, 0.0001);
      // eslint-disable-next-line react-hooks/immutability -- Three.js uniforms are mutable render state.
      mat.uniforms.uOpacity.value = 0;
      return;
    }
    const elapsed = clock.elapsedTime - startRef.current;
    const total = 0.42;
    if (elapsed >= total) {
      liveRef.current = false;
      mesh.visible = false;
      mesh.scale.set(0.0001, 0.0001, 0.0001);
      mat.uniforms.uOpacity.value = 0;
      return;
    }
    const t = elapsed / total;
    mesh.visible = true;

    // Phase 1: shoot out from the mouth. Phase 2: hold. Phase 3: fade.
    let lengthScale: number;
    let widthScale: number;
    let opacity: number;
    if (t < 0.18) {
      const p = 1 - Math.pow(1 - t / 0.18, 3);
      lengthScale = 0.12 + p * 0.88;
      widthScale  = 0.38 + p * 0.62;
      opacity     = 1.0;
    } else if (t < 0.34) {
      lengthScale = 1.0;
      widthScale  = 1.0;
      opacity     = 1.0;
    } else {
      const p = (t - 0.34) / 0.66;
      lengthScale = 1.0 + p * 0.16;
      widthScale  = 1.0 + p * 0.10;
      opacity     = Math.max(0, 1 - p * 1.08);
    }
    mesh.scale.set(widthScale, widthScale, lengthScale);
    mat.uniforms.uOpacity.value = opacity;
    mat.uniforms.uProgress.value = t;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={beamGeometry}
      position={[origin.x, origin.y, origin.z]}
      material={mat}
      renderOrder={10}
      visible={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Canvas wrapper — same delayed-mount + drop-shadow trick as bust
// ─────────────────────────────────────────────────────────────────
export function TeethJawR3F({
  active,
  hovered,
  beamTrigger,
  clickJawTrigger,
}: {
  active: boolean;
  hovered: boolean;
  beamTrigger: number;
  clickJawTrigger: number;
}) {
  const [canvasReady, setCanvasReady] = useState(false);
  const containerRef  = useRef<HTMLDivElement>(null);
  const mouseTargetRef = useRef<MouseTarget>({ rotY: 0, rotX: 0, active: false });
  // Cached container rect — 給 RealJaw useFrame 用，避免每幀呼叫 getBoundingClientRect
  // ResizeObserver + scroll listener 維護，命中率 ~100%（Landing 是 fixed 全屏）
  const containerRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setCanvasReady(true), 150);
    return () => clearTimeout(id);
  }, []);

  // 維護 cached rect（resize / scroll 時更新；其他時間 useFrame 直接讀）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateRect = () => {
      containerRectRef.current = el.getBoundingClientRect();
    };
    // 初始抓一次
    updateRect();
    // 容器大小變動（視窗 resize / RWD 切換 viewport）
    const ro = new ResizeObserver(updateRect);
    ro.observe(el);
    // 視窗滾動（rect.top/left 會變）— Landing 是 fixed 但保險起見還是聽
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, [canvasReady]);

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

  // Keep hover feedback in the jaw motion itself; no external halo.
  const shadowFilter = hovered ? "brightness(1.02)" : "none";

  return (
    <div
      ref={containerRef}
      style={{
        // Canvas is rendered 2× the LangPortal container, but offset so its
        // visual centre lands at ~75% / 75% of the LangPortal area (bottom-
        // right of the click zone) instead of dead-centre. With width 200%
        // and top:-25% / left:-25%, the canvas spans -25%..175% → centre 75%.
        position: "absolute",
        top: "-25%",
        left: "-25%",
        width: "200%",
        height: "200%",
        pointerEvents: "none",
        zIndex: 1,
        filter: shadowFilter,
        transition: "filter 380ms ease",
      }}
    >
      <Canvas
        // Camera positioned slightly above-right and tilted to look DOWN at
        // the jaw — gives the "looking down at a specimen on a plinth" feel.
        camera={{ position: [0.55, 0.85, 2.35], fov: 44, near: 0.01, far: 100 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0, -0.05, 0);
          gl.setClearColor(0x000000, 0);
        }}
      >
        <JawWithSuspense
          active={active}
          mouseTarget={mouseTargetRef}
          beamTrigger={beamTrigger}
          clickJawTrigger={clickJawTrigger}
          domContainerRef={containerRef}
          domRectRef={containerRectRef}
        />
      </Canvas>
    </div>
  );
}
