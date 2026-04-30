import * as THREE from "three";

// ─── 坑洞定義 ────────────────────────────────────────────────────────────────
// lat/lng 單位：度；radius / rimWidth：角距離（度）
// 位置只需視覺合理，不需精確月球 GIS
// 匯出供手機版 buildMoonTerrainSphere 重用（共享同一份坑洞定義）
export const MOON_CRATERS = [
  { lat:  15, lng:   20, radius: 18, rimWidth: 5 },  // 大坑（Tycho-like）
  { lat: -30, lng:  -60, radius: 12, rimWidth: 4 },
  { lat:  50, lng:   80, radius:  8, rimWidth: 3 },
  { lat: -10, lng:  150, radius: 14, rimWidth: 4 },
  { lat:  35, lng:  -40, radius:  9, rimWidth: 3 },
  { lat: -55, lng:   30, radius: 11, rimWidth: 4 },
  { lat:  20, lng: -110, radius:  7, rimWidth: 3 },
  { lat: -20, lng:   90, radius: 16, rimWidth: 5 },
  { lat:  60, lng:  -80, radius:  6, rimWidth: 2 },
  { lat:  -5, lng:  -20, radius: 10, rimWidth: 3 },
] as const;

// ─── 密度控制 ────────────────────────────────────────────────────────────────
const KEEP_BOWL    = 0.15;  // 坑洞碗底（空洞感）
const KEEP_RIM     = 1.00;  // 坑洞 rim（密集邊緣）
const KEEP_SURFACE = 0.55;  // 一般月面

interface BuildMoonPointsOptions {
  moonRadius: number;
  accentColor: THREE.Color;
  candidateCount?: number;
}

// ─── Color recipe codes（與 buildLandPoints 同模式） ────────────────────────
// 主題切換時不用重建月球點雲（22k candidates），只 recolor 已有的 color attribute
const RECIPE_ACCENT = 0;
const RECIPE_WHITE = 1;

/**
 * 計算兩個 lat/lng 點之間的角距離（度）
 */
function angularDist(
  lat1Deg: number, lng1Deg: number,
  lat2Deg: number, lng2Deg: number,
): number {
  const lat1 = (lat1Deg * Math.PI) / 180;
  const lat2 = (lat2Deg * Math.PI) / 180;
  const dLng = ((lng1Deg - lng2Deg) * Math.PI) / 180;
  const cos = Math.sin(lat1) * Math.sin(lat2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

/**
 * 用 cached recipes 重新算月球 colors（in-place mutate）
 */
function applyMoonColors(
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
    if (recipes[i] === RECIPE_WHITE) {
      colors[i3] = 1.0;
      colors[i3 + 1] = 1.0;
      colors[i3 + 2] = 1.0;
    } else {
      const b = brightness[i];
      colors[i3] = aR * b;
      colors[i3 + 1] = aG * b;
      colors[i3 + 2] = aB * b;
    }
  }
}

/**
 * 主題切換時呼叫：用 cached recipes 重算 colors，不重建 22k candidates
 *
 * 改動前：grabbed 期間每 1.5 秒 cycleTheme → buildMoonPoints (~30-60ms blocked)
 * 改動後：直接 recolor (~1ms)
 *
 * @returns true = 重算成功；false = 沒 recipes（fallback rebuild）
 */
export function recolorMoonPoints(
  geom: THREE.BufferGeometry,
  accentColor: THREE.Color,
): boolean {
  const colorAttr = geom.attributes.color;
  if (!colorAttr) return false;
  const recipes = geom.userData.colorRecipes as Uint8Array | undefined;
  const brightness = geom.userData.colorBrightness as Float32Array | undefined;
  if (!recipes || !brightness) return false;

  applyMoonColors(colorAttr.array as Float32Array, recipes, brightness, accentColor);
  colorAttr.needsUpdate = true;
  return true;
}

/**
 * 生成月球點雲 BufferGeometry
 *
 * 視覺設計：
 *   - 坑洞 rim：密度高（keepRim = 1.0），顏色較亮 + 5% 白色高亮
 *   - 坑洞碗底：密度低（keepBowl = 0.15），顏色偏暗 → 空洞感
 *   - 一般月面：中等密度（keepSurface = 0.55），比地球稀疏
 *
 * 結果 attributes：
 *   - position: 3D（球面座標 × moonRadius）
 *   - color:    per-vertex RGB（跟隨 accentColor）
 *
 * userData（給 recolorMoonPoints 用，主題切換時不重建）：
 *   - colorRecipes:    Uint8Array  0=accent, 1=white
 *   - colorBrightness: Float32Array  accent 亮度倍率（white 時為 0）
 */
export function buildMoonPoints({
  moonRadius,
  accentColor,
  candidateCount = 22000,
}: BuildMoonPointsOptions): THREE.BufferGeometry {
  const positions: number[] = [];
  const recipesArr: number[] = [];
  const brightnessArr: number[] = [];

  for (let i = 0; i < candidateCount; i++) {
    // Uniform sphere sampling
    const u1 = Math.random();
    const u2 = Math.random();
    const theta = 2 * Math.PI * u1;
    const phi   = Math.acos(2 * u2 - 1);

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);

    // 反推 lat/lng（與 buildLandPoints 同 convention）
    const lat = 90 - (phi * 180) / Math.PI;
    const lng = ((Math.atan2(z, -x) * 180) / Math.PI) - 180;

    // 分析此點屬於哪個坑洞區域
    type Region = "bowl" | "rim" | "surface";
    let region: Region = "surface";
    let rimFactor = 0; // 0..1，代表此點在 rim band 中的深度

    for (const c of MOON_CRATERS) {
      const dist = angularDist(lat, lng, c.lat, c.lng);

      if (dist < c.radius * 0.4) {
        region = "bowl";
        break;
      }
      if (dist >= c.radius - c.rimWidth && dist <= c.radius + c.rimWidth) {
        region = "rim";
        // 越靠近 rim 中心 → rimFactor 越高 → 顏色更亮
        const f = 1 - Math.abs(dist - c.radius) / c.rimWidth;
        if (f > rimFactor) rimFactor = f;
        // 不 break：可能有多個 rim 重疊，取 max rimFactor
      }
    }

    // keep 機率
    const keepProb =
      region === "bowl"    ? KEEP_BOWL    :
      region === "rim"     ? KEEP_RIM     :
                             KEEP_SURFACE;

    if (Math.random() > keepProb) continue;

    // 位置
    positions.push(x * moonRadius, y * moonRadius, z * moonRadius);

    // 顏色 recipe（決策一次，主題切換時重用）
    if (region === "rim") {
      if (Math.random() < 0.05) {
        // 白色高亮（rim 偶爾閃亮）
        recipesArr.push(RECIPE_WHITE);
        brightnessArr.push(0);
      } else {
        const b = Math.min(0.70 + Math.random() * 0.40 + rimFactor * 0.15, 1.15);
        recipesArr.push(RECIPE_ACCENT);
        brightnessArr.push(b);
      }
    } else if (region === "bowl") {
      const b = 0.28 + Math.random() * 0.17;
      recipesArr.push(RECIPE_ACCENT);
      brightnessArr.push(b);
    } else {
      const b = 0.55 + Math.random() * 0.30;
      recipesArr.push(RECIPE_ACCENT);
      brightnessArr.push(b);
    }
  }

  const recipes = new Uint8Array(recipesArr);
  const brightness = new Float32Array(brightnessArr);
  const colors = new Float32Array(recipes.length * 3);
  applyMoonColors(colors, recipes, brightness, accentColor);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
  geom.userData.colorRecipes = recipes;
  geom.userData.colorBrightness = brightness;
  return geom;
}
