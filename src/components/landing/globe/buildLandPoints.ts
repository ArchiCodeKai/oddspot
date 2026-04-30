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
// 匯出供 GlobeSceneMobile 的 displaced wireframe sphere 重用
export const MOUNTAIN_BUMPS = [
  { lat:  28, lng:  86, width: 12, height: 0.022 }, // 喜馬拉雅（最高）
  { lat:  46, lng:  10, width:  7, height: 0.012 }, // 阿爾卑斯
  { lat: -15, lng: -72, width: 18, height: 0.018 }, // 安地斯
  { lat:  43, lng: -110, width: 14, height: 0.014 }, // 落磯山脈
  { lat:   0, lng:  37, width: 10, height: 0.010 }, // 東非高原（弱）
  { lat: 23.7, lng: 121.0, width: 1.8, height: 0.014 }, // 台灣中央山脈（OddSpot 重點）
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
 *
 * 匯出供 displaced wireframe sphere 重用（共享同一份山脈定義，視覺一致）
 */
export function mountainElevation(lat: number, lng: number): number {
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

// ─── Color recipe codes（決策一次，主題切換時重用） ──────────────────────────
// 把每個點「該長什麼顏色」的決策從 baked color 改成 recipe + brightness，
// 主題切換時不用重建 geometry，只要重算 colors attribute（從 ~80ms → ~2ms）
const RECIPE_ACCENT = 0;
const RECIPE_WHITE = 1;
const RECIPE_GOLD = 2;

/**
 * 用 cached recipes 重新算 colors（in-place mutate colors array）
 * 不依賴 Math.random，每次主題切換結果穩定（不會「閃」一下）
 */
function applyLandColors(
  colors: Float32Array,
  recipes: Uint8Array,
  brightness: Float32Array,
  accentColor: THREE.Color,
): void {
  const aR = accentColor.r;
  const aG = accentColor.g;
  const aB = accentColor.b;
  const n = recipes.length;
  for (let i = 0; i < n; i++) {
    const i3 = i * 3;
    const r = recipes[i];
    if (r === RECIPE_WHITE) {
      colors[i3] = 1.0;
      colors[i3 + 1] = 1.0;
      colors[i3 + 2] = 1.0;
    } else if (r === RECIPE_GOLD) {
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.82;
      colors[i3 + 2] = 0.45;
    } else {
      const b = brightness[i];
      colors[i3] = aR * b;
      colors[i3 + 1] = aG * b;
      colors[i3 + 2] = aB * b;
    }
  }
}

/**
 * 主題切換時呼叫：用 cached recipes 重算 colors，不重建 geometry
 *
 * 改動前：fetch GeoJSON → buildHeightmap → buildLandPoints (~80-150ms main thread blocked)
 * 改動後：直接讀 userData → applyLandColors (~1-3ms)
 *
 * @returns true = 重算成功；false = geometry 沒 recipes（用舊版 buildLandPoints 建的，要 fallback rebuild）
 */
export function recolorLandPoints(
  geom: THREE.BufferGeometry,
  accentColor: THREE.Color,
): boolean {
  const colorAttr = geom.attributes.color;
  if (!colorAttr) return false;
  const recipes = geom.userData.colorRecipes as Uint8Array | undefined;
  const brightness = geom.userData.colorBrightness as Float32Array | undefined;
  if (!recipes || !brightness) return false;

  applyLandColors(colorAttr.array as Float32Array, recipes, brightness, accentColor);
  colorAttr.needsUpdate = true;
  return true;
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
 *
 * userData（給 recolorLandPoints 用，主題切換時不用重建）：
 *   - colorRecipes:    Uint8Array  每個點的 color 類型（0=accent, 1=white, 2=gold）
 *   - colorBrightness: Float32Array  accent 時的亮度倍率（white/gold 時為 0）
 */
export function buildLandPoints({
  heightmap,
  accentColor,
  candidateCount = 90000,
  threshold = 100,
  highlightChance = 0.06,
}: BuildLandPointsOptions): THREE.BufferGeometry {
  const positions: number[] = [];
  // 預分配上限避免 array growth：實際命中陸地的點 << candidateCount
  const recipesArr: number[] = [];
  const brightnessArr: number[] = [];

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

    // ── 顏色 recipe 決策（只跑一次，存 cache） ─────────────────────────
    // 山頂區域稍微提亮（bump > 0.008 開始線性提亮，給山脊一點立體感）
    const highAlt = Math.min(1, Math.max(0, (bump - 0.008) / 0.022));
    const rand = Math.random();
    if (rand < highlightChance) {
      if (Math.random() < 0.55) {
        recipesArr.push(RECIPE_WHITE);
        brightnessArr.push(0);
      } else {
        recipesArr.push(RECIPE_GOLD);
        brightnessArr.push(0);
      }
    } else {
      const brightness = Math.min(0.55 + Math.random() * 0.45 + highAlt * 0.15, 1.15);
      recipesArr.push(RECIPE_ACCENT);
      brightnessArr.push(brightness);
    }
  }

  // 用 cache 計算初始 colors（與後續 recolor 走同一路徑，保證一致性）
  const recipes = new Uint8Array(recipesArr);
  const brightness = new Float32Array(brightnessArr);
  const colors = new Float32Array(recipes.length * 3);
  applyLandColors(colors, recipes, brightness, accentColor);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  // 把決策 cache 掛在 geometry 上，主題切換時 recolorLandPoints() 直接讀
  geom.userData.colorRecipes = recipes;
  geom.userData.colorBrightness = brightness;
  return geom;
}
