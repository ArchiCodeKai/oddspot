import * as THREE from "three";
import { bilinearSample } from "./geoUtils";

const HEIGHTMAP_W = 256;
const HEIGHTMAP_H = 128;

// ─── 地形參數 ────────────────────────────────────────────────────────────────
const LAND_BASE_ELEVATION = 0.014;    // 一般陸地高於球面的基底 (+1.0 → 1.014)
const TERRAIN_NOISE_AMOUNT = 0.003;   // deterministic 微擾幅度 [0, 0.003]
const MAX_LAND_RADIUS = 1.045;        // 任何點的硬性上限

// ─── 山脈 Gaussian bump 列表 ─────────────────────────────────────────────────
// 位置只需大致合理，不需精確 GIS；width 單位 = 緯/經度
// falloff: height * exp(-(dist/width)²)
const MOUNTAIN_BUMPS = [
  { lat:  28, lng:  86, width: 12, height: 0.022 }, // 喜馬拉雅（最高）
  { lat:  46, lng:  10, width:  7, height: 0.012 }, // 阿爾卑斯
  { lat: -15, lng: -72, width: 18, height: 0.018 }, // 安地斯
  { lat:  43, lng: -110, width: 14, height: 0.014 }, // 落磯山脈
  { lat:   0, lng:  37, width: 10, height: 0.010 }, // 東非高原（弱）
] as const;

/**
 * 根據 lat/lng 的 deterministic hash 回傳 [0, 1) 的雜訊值
 *
 * 使用 sin-fract 技術（與 GLSL procedural noise 同理）：
 *   相同的 lat/lng 每次都回傳相同結果 → 幾何重建後位置不會跳動
 */
function deterministicNoise(lat: number, lng: number): number {
  const v = Math.sin(lat * 127.1 + lng * 311.7) * 43758.5453123;
  return v - Math.floor(v); // [0, 1)
}

/**
 * 計算指定 lat/lng 點的山脈 bump 高度（所有 bump 疊加）
 * falloff: height * exp(-(euclideanDist / width)²)
 */
function mountainElevation(lat: number, lng: number): number {
  let elev = 0;
  for (const m of MOUNTAIN_BUMPS) {
    const dLat = lat - m.lat;
    const dLng = lng - m.lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    elev += m.height * Math.exp(-((dist / m.width) ** 2));
  }
  return elev;
}

interface BuildLandPointsOptions {
  heightmap: Uint8ClampedArray;
  accentColor: THREE.Color;
  /** 候選點數（會以 heightmap 篩選掉海洋部分） */
  candidateCount?: number;
  /** sample > threshold 視為陸地（0~255） */
  threshold?: number;
  /** highlight 機率（白/金亮點，給 sci-fi data-viz 質感） */
  highlightChance?: number;
}

/**
 * 從 heightmap 抽出陸地位置 → Points BufferGeometry
 *
 * 高度層次：
 *   ocean (buildOceanPoints): radius ~1.003
 *   land base:                1.0 + LAND_BASE_ELEVATION(0.014) = 1.014
 *   mountain peak（喜馬拉雅）: 1.014 + 0.022 = 1.036
 *   max cap:                  1.045
 *   atmosphere shell:         1.065
 *
 * 微擾方式：
 *   使用 lat/lng deterministic noise（非 Math.random）→ 幾何重建後不跳動
 *   range [0, 0.003]，只是讓平地不呆板，不影響輪廓
 *
 * 結果 attributes：
 *   - position: 3D
 *   - color:    per-vertex RGB（accent + 少量白/金 highlight）
 */
export function buildLandPoints({
  heightmap,
  accentColor,
  candidateCount = 90000,
  threshold = 100,
  highlightChance = 0.06,
}: BuildLandPointsOptions): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];

  const aR = accentColor.r;
  const aG = accentColor.g;
  const aB = accentColor.b;

  for (let i = 0; i < candidateCount; i++) {
    // Uniform sphere sampling
    const u1 = Math.random();
    const u2 = Math.random();
    const theta = 2 * Math.PI * u1;
    const phi = Math.acos(2 * u2 - 1);

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);

    // 反推 lat/lng（與 latLngToVec3 convention 對齊）
    const phiActual = Math.acos(y);
    const thetaActual = Math.atan2(z, -x);
    const lat = 90 - (phiActual * 180) / Math.PI;
    const lng = ((thetaActual * 180) / Math.PI) - 180;
    const uMap = (lng + 180) / 360;
    const vMap = (90 - lat) / 180;

    const sample = bilinearSample(heightmap, HEIGHTMAP_W, HEIGHTMAP_H, uMap, vMap);
    if (sample <= threshold) continue; // 海洋，略過

    // ── 高度計算 ──────────────────────────────────────────────────────
    const bump = mountainElevation(lat, lng);
    const noise = deterministicNoise(lat, lng) * TERRAIN_NOISE_AMOUNT;
    const elevation = LAND_BASE_ELEVATION + bump + noise;

    // 強制上限（防止極端 bump 疊加超標）
    const r = Math.min(1.0 + elevation, MAX_LAND_RADIUS);
    positions.push(x * r, y * r, z * r);

    // ── 顏色計算 ──────────────────────────────────────────────────────
    // 山頂區域稍微提亮（bump > 0.008 開始線性提亮，給山脊一點立體感）
    const highAlt = Math.min(1, Math.max(0, (bump - 0.008) / 0.022));
    const rand = Math.random();
    if (rand < highlightChance) {
      if (Math.random() < 0.55) {
        colors.push(1.0, 1.0, 1.0); // 白
      } else {
        colors.push(1.0, 0.82, 0.45); // 金
      }
    } else {
      const brightness = 0.55 + Math.random() * 0.45 + highAlt * 0.15;
      const b = Math.min(brightness, 1.15);
      colors.push(aR * b, aG * b, aB * b);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geom;
}
