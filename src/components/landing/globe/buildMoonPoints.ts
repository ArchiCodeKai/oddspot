import * as THREE from "three";

// ─── 坑洞定義 ────────────────────────────────────────────────────────────────
// lat/lng 單位：度；radius / rimWidth：角距離（度）
// 位置只需視覺合理，不需精確月球 GIS
const MOON_CRATERS = [
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
 */
export function buildMoonPoints({
  moonRadius,
  accentColor,
  candidateCount = 22000,
}: BuildMoonPointsOptions): THREE.BufferGeometry {
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

    // 顏色
    if (region === "rim") {
      if (Math.random() < 0.05) {
        // 白色高亮（rim 偶爾閃亮）
        colors.push(1.0, 1.0, 1.0);
      } else {
        const b = Math.min(0.70 + Math.random() * 0.40 + rimFactor * 0.15, 1.15);
        colors.push(aR * b, aG * b, aB * b);
      }
    } else if (region === "bowl") {
      const b = 0.28 + Math.random() * 0.17;
      colors.push(aR * b, aG * b, aB * b);
    } else {
      const b = 0.55 + Math.random() * 0.30;
      colors.push(aR * b, aG * b, aB * b);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("color",    new THREE.Float32BufferAttribute(colors, 3));
  return geom;
}
