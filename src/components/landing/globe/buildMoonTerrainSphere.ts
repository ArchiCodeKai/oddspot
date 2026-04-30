import * as THREE from "three";
import { MOON_CRATERS } from "./buildMoonPoints";

// ─── 月球地形視覺參數 ─────────────────────────────────────────────
const CRATER_BOWL_DEPTH = 0.105;     // 坑洞碗底內凹（球半徑比例）
const CRATER_RIM_HEIGHT = 0.058;     // 坑洞 rim 凸起
const SURFACE_ROUGHNESS = 0.018;     // 表面粗糙 noise 振幅
const NOISE_FREQ_LO = 7.5;
const NOISE_FREQ_HI = 18.3;

// ─── 球面角距離（度）─────────────────────────────────────────────────
function angularDist(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLng = ((lng1 - lng2) * Math.PI) / 180;
  const cos =
    Math.sin(phi1) * Math.sin(phi2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function moonNoise(lat: number, lng: number): number {
  const v1 = Math.sin(lat * NOISE_FREQ_LO + lng * (NOISE_FREQ_LO - 0.7)) * 43758.5453;
  const v2 = Math.sin(lat * NOISE_FREQ_HI - lng * (NOISE_FREQ_HI + 0.3)) * 12345.6789;
  const a = (v1 - Math.floor(v1)) * 0.6;
  const b = (v2 - Math.floor(v2)) * 0.4;
  return (a + b - 0.5) * 2;
}

/**
 * 計算 lat/lng 的月球層級資訊
 * @returns { displacement, craterValue }
 *   - displacement: 球半徑相對位移（負=內凹、正=凸起）
 *   - craterValue: 0 = 最深 bowl、0.5 = 平坦表面、1 = rim 高點（給 shader alpha 分層用）
 */
function moonSurfaceInfo(lat: number, lng: number): {
  displacement: number;
  craterValue: number;
} {
  let displacement = 0;
  // craterValue 預設 0.5 = 一般平地
  let craterValue = 0.5;

  for (const c of MOON_CRATERS) {
    const dist = angularDist(lat, lng, c.lat, c.lng);
    const bowlEdge = c.radius * 0.4;
    if (dist < bowlEdge) {
      const depth = (1 - dist / bowlEdge);
      displacement -= CRATER_BOWL_DEPTH * depth * depth;
      // bowl 中心 = 0，bowl 邊緣 = 0.4（仍偏暗）
      const localCrater = 0.4 - depth * 0.4;
      if (localCrater < craterValue) craterValue = localCrater;
    } else if (dist >= c.radius - c.rimWidth && dist <= c.radius + c.rimWidth) {
      const f = 1 - Math.abs(dist - c.radius) / c.rimWidth;
      displacement += CRATER_RIM_HEIGHT * f;
      // rim：peak f=1 → craterValue 1.0，往兩側衰減
      const localCrater = 0.5 + f * 0.5;
      if (localCrater > craterValue) craterValue = localCrater;
    }
  }

  // 全月面普遍 noise（粗糙質感，影響 displacement，輕微影響 craterValue）
  const noise = moonNoise(lat, lng);
  displacement += noise * SURFACE_ROUGHNESS;
  // surface noise 也微調 craterValue（粗糙處稍亮）
  craterValue = Math.max(0, Math.min(1, craterValue + noise * 0.06));

  return { displacement, craterValue };
}

interface BuildMoonTerrainOptions {
  moonRadius: number;
  segmentsW?: number;
  segmentsH?: number;
}

export interface MoonTerrainResult {
  /** Mesh geometry，含 aCrater attribute（給 ShaderMaterial 分層 alpha 用） */
  meshGeometry: THREE.BufferGeometry;
  /** 輔助線框（強化 crater 邊界辨識） */
  wireGeometry: THREE.BufferGeometry;
}

/**
 * 月球 displaced mesh + wireframe
 *
 * mesh 帶 aCrater attribute：
 *   - 0   → bowl 最深處（最透明、最暗）
 *   - 0.5 → 平地（中等透明）
 *   - 1   → rim 高點（最不透明、最亮）
 *
 * 配合 shader 分層 alpha → 月球不再是純線框也不是實心球
 */
export function buildMoonTerrainSphere({
  moonRadius,
  segmentsW = 32,
  segmentsH = 16,
}: BuildMoonTerrainOptions): MoonTerrainResult {
  const sphere = new THREE.SphereGeometry(1, segmentsW, segmentsH);
  const positions = sphere.attributes.position.array as Float32Array;
  const vertexCount = positions.length / 3;
  const craterValues = new Float32Array(vertexCount);

  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    const ux = positions[i3];
    const uy = positions[i3 + 1];
    const uz = positions[i3 + 2];

    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, uy))) * 180) / Math.PI;
    const lng = ((Math.atan2(uz, -ux) * 180) / Math.PI) - 180;

    const { displacement, craterValue } = moonSurfaceInfo(lat, lng);
    craterValues[i] = craterValue;

    const r = moonRadius * (1 + displacement);
    positions[i3]     = ux * r;
    positions[i3 + 1] = uy * r;
    positions[i3 + 2] = uz * r;
  }
  sphere.computeBoundingSphere();
  sphere.computeVertexNormals();
  sphere.setAttribute("aCrater", new THREE.BufferAttribute(craterValues, 1));

  const wireframe = new THREE.WireframeGeometry(sphere);

  return {
    meshGeometry: sphere,
    wireGeometry: wireframe,
  };
}
