"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { GazeController } from "@/hooks/useGazeController";

// 眼球模型路徑（5.9MB GLB）— 透過 React.lazy + Suspense 在第一次拖月球時才載入
const MODEL_URL = "/models/low_poly_eye.glb";

interface EyeModelProps {
  /** 月球半徑：模型會自動 fit 進這個外接球，視覺尺寸與點雲月球一致 */
  radius: number;
  /** 0 = 隱形（剛開始拖、morph 還小）、1 = 完整顯示。傳 ref 避免 React re-render */
  visibilityRef: React.RefObject<number>;
  /** 主題 accent color（影響虹膜染色） */
  accentColor: THREE.Color;
  /** 凝視控制器：眼球永遠 lookAt camera，gazeDir 提供細微 saccade offset */
  gaze: GazeController;
}

/**
 * Cthulhu 眼球模型（GLTF）— 拖月球時取代點雲眼球
 *
 * 行為：
 *  - 永遠面向攝影機（lookAt camera position），不被父節點 tumble 帶走
 *  - gazeDir 推導 ±15° 的 saccade rotation offset（瞳孔感隨機掃視）
 *  - blink 時 Y 軸微壓扁（lid 視覺）
 *  - visibility 0→1 透過所有 mesh material 的 opacity 控制
 *  - tremor wobble：morph 顯著時整體高頻 ±2% 旋轉抖動
 */
export function EyeModel({ radius, visibilityRef, accentColor, gaze }: EyeModelProps) {
  const { scene } = useGLTF(MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  // ── Acid Eye ShaderMaterial：忽略原 GLTF texture，純程序生成符合主題的眼球視覺 ──
  //   1. 以 local position 投影到「前向軸」算 radial gradient → pupil / iris / sclera 分區
  //   2. 顏色 posterize 4 階 → acid/Y2K 平塗感
  //   3. 掃描線 + noise grain → CRT 質感
  //   4. Fresnel rim 用 accentColor → 邊緣酸性光暈
  const sharedUniforms = useMemo(
    () => ({
      uOpacity:    { value: 0 },
      uAccent:     { value: accentColor.clone() },
      uTime:       { value: 0 },
      uGazeDir:    { value: new THREE.Vector2(0, 0) },
      uMorph:      { value: 0 },
      uForwardAxis:{ value: new THREE.Vector3(0, 0, 1) }, // mount 時推算
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    sharedUniforms.uAccent.value.copy(accentColor);
  }, [accentColor, sharedUniforms]);

  // 把 GLTF scene clone 出來避免共用引用；計算外接球 + 套用 acid shader
  const { content, fitScale, materials } = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const fit = sphere.radius > 0 ? radius / sphere.radius : 1;

    // 推算「前向軸」：取所有 mesh local-space bounding box 的 max-Z 作為瞳孔朝向
    // 通常眼球模型 +Z 會是視線方向，但我們直接從幾何推算更穩
    const tmpBox = new THREE.Box3();
    let maxZ = -Infinity;
    cloned.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        c.geometry.computeBoundingBox();
        if (c.geometry.boundingBox) {
          tmpBox.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld);
          if (tmpBox.max.z > maxZ) maxZ = tmpBox.max.z;
        }
      }
    });
    sharedUniforms.uForwardAxis.value.set(0, 0, 1);

    const mats: THREE.ShaderMaterial[] = [];
    const acidVert = /* glsl */ `
      varying vec3 vLocalPos;
      varying vec3 vViewNormal;
      varying float vFresnel;
      void main() {
        vLocalPos = position;
        vec3 worldN = normalize(normalMatrix * normal);
        vViewNormal = worldN;
        vFresnel = pow(1.0 - max(0.0, worldN.z), 2.4);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const acidFrag = /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uAccent;
      uniform float uTime;
      uniform vec2 uGazeDir;
      uniform float uMorph;
      uniform vec3 uForwardAxis;
      varying vec3 vLocalPos;
      varying vec3 vViewNormal;
      varying float vFresnel;

      // 簡單 hash noise（不用 texture，shader-only）
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // 4 階 posterize：acid/Y2K 平塗
      vec3 posterize(vec3 c, float steps) {
        return floor(c * steps) / steps;
      }

      void main() {
        // ── 用 local pos 投影到前向軸算 radial gradient ──
        // 重要：axis 永遠固定在 model 本地的 +Z（uForwardAxis），不再被 uGazeDir 轉
        // 視線方向由「mesh 整體旋轉（root.lookAt + inner.rotation）」承擔，shader 只決定區域顏色
        // 這樣 pupil/iris 的染色永遠跟著 mesh 表面，不會浮在「內部一個小球」上
        vec3 normLocal = normalize(vLocalPos);
        vec3 axis = uForwardAxis;
        float forward = dot(normLocal, axis);  // [-1, 1]，1 = 正前（瞳孔朝向）

        // ── 模糊化的 pupil/iris/sclera 過渡 ──
        // 把每段的 smoothstep 範圍拉寬 → 邊緣不銳利、層次柔和、不再像霓虹發光
        // pupil: 0.78–0.95（之前 0.92–0.985 太尖銳）
        // iris:  0.30–0.78（之前 0.55–0.85 太集中）
        // 三段大幅 overlap，讓顏色互相浸染
        float pupilMask  = smoothstep(0.78, 0.95, forward);
        float irisMask   = smoothstep(0.30, 0.78, forward) - pupilMask * 0.6;
        irisMask = clamp(irisMask, 0.0, 1.0);
        float scleraMask = clamp(1.0 - smoothstep(0.30, 0.62, forward), 0.0, 1.0);

        // ── Acid 配色（壓低飽和、增加 accent 渲染、不再霓虹）──
        // sclera: 偏冷白 + accent 浸染（30% → 50%）
        vec3 scleraCol = mix(vec3(0.86, 0.88, 0.82), uAccent * 0.45, 0.50);
        scleraCol += vec3(0.45, 0.06, 0.08) * vFresnel * 0.30;

        // iris: 不再 ×1.45 高亮、改 ×0.85 + 加深陰影感
        // 條紋從 26 條 → 14 條 + 加 noise 擾動 → 模糊放射感
        float angle = atan(normLocal.y, normLocal.x);
        float irisNoise = hash(vec2(angle * 4.0, forward * 8.0)) - 0.5;
        float radial = sin(angle * 14.0 + uTime * 0.5 + irisNoise * 1.4) * 0.5 + 0.5;
        vec3 irisCol = uAccent * (0.85 + radial * 0.22) + vec3(0.04, 0.0, 0.08);

        // pupil: 深沉的 accent × 0.18（不亮、不發光、暗瞳孔感）
        // 加一層極淡的 noise → 瞳孔不再是純色「霓虹點」，而是模糊的暗區
        float pupilNoise = hash(vLocalPos.xy * 14.0 + floor(uTime * 3.0));
        vec3 pupilCol = uAccent * 0.18 * (0.6 + pupilNoise * 0.4);

        vec3 col = scleraCol * scleraMask + irisCol * irisMask + pupilCol * pupilMask;

        // ── 整體 desaturate 一點，避免單色 acid 太刺眼 ──
        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, 0.78);

        // ── Posterize：保留階調但放寬到 7 階（之前 5 階太硬）──
        col = posterize(col, 7.0);

        // ── CRT 掃描線（弱化）──
        float scanline = 0.94 + 0.06 * sin(gl_FragCoord.y * 1.6 + uTime * 4.0);
        col *= scanline;

        // ── Noise grain（保留 gritty）──
        float n = hash(gl_FragCoord.xy + floor(uTime * 12.0));
        col += (n - 0.5) * 0.05;

        // ── Fresnel rim：邊緣 accent glow（壓低 0.45 → 0.25，不再霓虹）──
        col += uAccent * vFresnel * 0.25;

        // ── morph 顯著時 chromatic shift（保留色帶錯位）──
        float chromaShift = sin(uTime * 17.0 + vLocalPos.y * 31.0) * uMorph * 0.04;
        col.r += chromaShift;
        col.b -= chromaShift;

        // ── Radial fade：mesh 中心瞳孔/虹膜實在、外圍透明交給點雲粒子 ──
        // 把過渡帶拉到 0.20–0.65（更早開始淡、結束點更靠中心）
        // → 中心 mesh 實體更小，外圍粒子接管的範圍更大、散逸感更強
        float meshAlpha = smoothstep(0.20, 0.65, forward);

        gl_FragColor = vec4(col, uOpacity * meshAlpha);
      }
    `;

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 棄用原 PBR material，整個換成 acid shader
        const acidMat = new THREE.ShaderMaterial({
          uniforms: sharedUniforms,
          vertexShader: acidVert,
          fragmentShader: acidFrag,
          transparent: true,
          depthWrite: false,
          // 關鍵：關掉 depthTest 避免被 Moon occluder（MOON_RADIUS 寫深度）剪掉
          depthTest: false,
          side: THREE.FrontSide,
          blending: THREE.NormalBlending,
        });
        child.material = acidMat;
        child.renderOrder = 5;
        mats.push(acidMat);
      }
    });

    return { content: cloned, fitScale: fit, materials: mats };
  }, [scene, radius, sharedUniforms]);

  // 暫存：避免每幀 alloc
  const camWorldRef = useRef(new THREE.Vector3());
  const lastOpacityRef = useRef(-1);

  useFrame((state, dt) => {
    const root = groupRef.current;
    const inner = innerRef.current;
    if (!root || !inner) return;

    // ── visibility 套到 shared uniform（只更新一個 float，N 個 material 共用）──
    const op = THREE.MathUtils.clamp(visibilityRef.current ?? 0, 0, 1);
    if (Math.abs(op - lastOpacityRef.current) > 0.001) {
      sharedUniforms.uOpacity.value = op;
      lastOpacityRef.current = op;
    }
    // visibility 完全為 0 時直接隱藏整個 group，省掉 lookAt/saccade/scale 計算
    root.visible = op > 0.01;
    if (!root.visible) return;

    // ── Acid shader uniforms（每幀一次 write，N 個 mesh 共用同一份 uniforms）──
    sharedUniforms.uTime.value = state.clock.elapsedTime;
    sharedUniforms.uGazeDir.value.copy(gaze.gazeDir);
    sharedUniforms.uMorph.value = THREE.MathUtils.clamp(gaze.morph.current, 0, 1);

    // ── 永遠面向攝影機：lookAt(cameraWorldPos)
    state.camera.getWorldPosition(camWorldRef.current);
    root.lookAt(camWorldRef.current);

    // ── gazeDir → 瞳孔 saccade（±15°）：套在 inner group，跟 lookAt 疊加
    const yawOffset = gaze.gazeDir.x * 0.26;     // 約 ±15°
    const pitchOffset = -gaze.gazeDir.y * 0.22;
    inner.rotation.y = THREE.MathUtils.lerp(inner.rotation.y, yawOffset, 1 - Math.exp(-dt * 16));
    inner.rotation.x = THREE.MathUtils.lerp(inner.rotation.x, pitchOffset, 1 - Math.exp(-dt * 16));

    // ── blink：Y 軸壓扁（眼皮闔上的視覺替代）──
    const blink = THREE.MathUtils.clamp(gaze.blink.current, 0, 1);
    const yScale = THREE.MathUtils.lerp(1, 0.18, blink);

    // ── tremor wobble：morph 顯著時整體 ±2% 旋轉抖動 ──
    const morph = THREE.MathUtils.clamp(gaze.morph.current, 0, 1);
    const t = state.clock.elapsedTime;
    const wobble = morph > 0.05
      ? Math.sin(t * 27.0) * 0.02 * morph
      : 0;
    inner.rotation.z = wobble;

    inner.scale.set(fitScale, fitScale * yScale, fitScale);
  });

  return (
    <group ref={groupRef}>
      <group ref={innerRef}>
        <primitive object={content} />
      </group>
    </group>
  );
}

// 在 idle 時段背景預載：避開首屏 LCP 同時確保第一次拖月球時 GLTF 已就緒。
// （之前不 preload 導致首拖時 Suspense 觸發 5.9MB 載入 → canvas 被裁、月球看起來消失 + 卡頓）
if (typeof window !== "undefined") {
  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback;
  if (ric) {
    ric(() => useGLTF.preload(MODEL_URL), { timeout: 4000 });
  } else {
    setTimeout(() => useGLTF.preload(MODEL_URL), 2500);
  }
}
