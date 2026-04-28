import * as THREE from "three";
import { bilinearSample, forEachRing, type GeoJSONFeatureCollection } from "./geoUtils";

const HEIGHTMAP_W = 256;
const HEIGHTMAP_H = 128;
const DISPLACE_MAX = 0.05;          // 大陸基底外推 5%（海岸 ledge）
const MOUNTAIN_AMP = 0.035;         // 山脈最大額外抬升（總相當於 8.5% 半徑，喜馬拉雅級）
const SPHERE_SEGMENTS_W = 96;       // 96×60 = ~5800 vertex，足夠多邊形切割面顯示大陸塊體
const SPHERE_SEGMENTS_H = 60;

/**
 * 多尺度山脈 noise — 三個不同頻率疊加：
 *   - 低頻：模擬大規模山脈帶（喜馬拉雅、安地斯這種橫跨大陸的脊）
 *   - 中頻：個別山峰
 *   - 高頻：表面起伏粗糙感
 * 結果範圍大約 -1 ~ 1
 *
 * 因為球面位置 (x, y, z) 是固定的（單位向量），相同位置永遠取得相同 noise → deterministic
 * 不需要真實地理資料，但視覺上會看到「某些大陸區域是高聳山脈、某些是低平盆地」
 */
function mountainNoise(x: number, y: number, z: number): number {
  // 大尺度（mountain ranges 級別）— 最大貢獻
  const macro = Math.sin(x * 3.7 + y * 2.9) * Math.cos(z * 4.3) * 0.6;
  // 中尺度（individual peaks）
  const meso = Math.sin(y * 9.1 + z * 7.3) * Math.cos(x * 8.7) * 0.3;
  // 高尺度（surface texture）
  const micro = Math.sin(x * 17.3 + z * 14.1) * Math.cos(y * 15.7) * 0.15;
  // 額外不規則（避免太規律）
  const irregular = Math.sin(x * 23.1 - y * 19.5) * 0.08;
  return macro + meso + micro + irregular;
}

/**
 * GeoJSON polygon ring → equirectangular canvas pixels（多邊形填充）
 * canvas: x = (lng + 180) / 360 * w
 *         y = (90 - lat) / 180 * h
 * 跨經度 180/-180 邊界的 polygon 需要拆分（Natural Earth 110m land 大多數已經處理過了，
 * 但俄羅斯這類橫跨換日線的地塊可能仍需小心）
 */
function drawRingToCanvas(
  ctx: CanvasRenderingContext2D,
  ring: number[][],
  w: number,
  h: number,
): void {
  if (ring.length < 3) return;
  ctx.beginPath();
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const x = ((lng + 180) / 360) * w;
    const y = ((90 - lat) / 180) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * 把 GeoJSON 大陸資料 rasterize 到一個 256×128 的灰階 heightmap
 * land = 200, sea = 0, 海岸軟化 ~2px
 */
export function buildHeightmap(landData: GeoJSONFeatureCollection): Uint8ClampedArray {
  if (typeof document === "undefined") {
    // SSR fallback：回傳全 0（不該發生，因為 GlobeScene ssr:false）
    return new Uint8ClampedArray(HEIGHTMAP_W * HEIGHTMAP_H);
  }

  const canvas = document.createElement("canvas");
  canvas.width = HEIGHTMAP_W;
  canvas.height = HEIGHTMAP_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // 海洋背景（黑）
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, HEIGHTMAP_W, HEIGHTMAP_H);

  // 陸地（灰階 200，留 buffer 讓 blur 後不會被夾到 255）
  ctx.fillStyle = "rgb(200,200,200)";
  forEachRing(landData, (ring) => drawRingToCanvas(ctx, ring, HEIGHTMAP_W, HEIGHTMAP_H));

  // 海岸軟化：輕微 blur 0.6px → 維持海岸線銳利，但避免極端鋸齒
  // 配合 smoothstep ledge displacement，海陸邊界會像板塊一樣鋒利
  ctx.filter = "blur(0.6px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";

  // 讀回 pixel data，只取 R channel（灰階）
  const imageData = ctx.getImageData(0, 0, HEIGHTMAP_W, HEIGHTMAP_H);
  const heightmap = new Uint8ClampedArray(HEIGHTMAP_W * HEIGHTMAP_H);
  for (let i = 0; i < heightmap.length; i++) {
    heightmap[i] = imageData.data[i * 4];
  }
  return heightmap;
}

/**
 * 用 heightmap 對 SphereGeometry 做 vertex displacement
 * 大陸區域的頂點被往外推，海洋保持球面
 *
 * @param heightmap 256×128 灰階 buffer
 * @returns 已位移的 SphereGeometry
 */
/**
 * 給已位移的 sphere geometry 套上 vertex colors
 * 用海拔（heightmap sample）做 ocean → land 線性漸變：
 *   sample = 0   → ocean color（深，接近 panel）
 *   sample = 255 → land color（亮，接近 accent）
 * 海岸線會自然有過渡色（因為 heightmap blur 過）
 *
 * 之後 mesh 用 vertexColors=true，就能看到大陸是亮塊、海洋是暗區，
 * 不是一片均一色的素模感
 */
export function applyVertexColors(
  geom: THREE.SphereGeometry,
  heightmap: Uint8ClampedArray,
  oceanColor: THREE.Color,
  landColor: THREE.Color,
): void {
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + y * y + z * z) || 1;
    const phi = Math.acos(y / r);
    const theta = Math.atan2(z, -x);
    const lat = 90 - (phi * 180) / Math.PI;
    const lng = ((theta * 180) / Math.PI) - 180;
    const u = (lng + 180) / 360;
    const v = (90 - lat) / 180;

    const t = bilinearSample(heightmap, HEIGHTMAP_W, HEIGHTMAP_H, u, v) / 255;
    // 板塊交界：smoothstep 在很窄的轉換區間（0.35-0.55）做鋒利切換
    //   < 0.35 → 純海洋色  > 0.55 → 純大陸色  中間 → 短促 smoothstep
    //   結果：海陸交界明顯為「色塊邊界」而非漸層暈染
    let k: number;
    if (t < 0.35) {
      k = 0;
    } else if (t > 0.55) {
      k = 1;
    } else {
      const ts = (t - 0.35) / 0.2;
      k = ts * ts * (3 - 2 * ts);
    }

    colors[i * 3]     = oceanColor.r + (landColor.r - oceanColor.r) * k;
    colors[i * 3 + 1] = oceanColor.g + (landColor.g - oceanColor.g) * k;
    colors[i * 3 + 2] = oceanColor.b + (landColor.b - oceanColor.b) * k;
  }

  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/**
 * 從位移後的 sphere geometry 抽出「海洋頂點」位置
 * 海洋判定：heightmap 採樣 < ocean_threshold（預設 50/255）
 * 結果用於 OceanGlow 元件的潮汐光點 — 不取陸地頂點，只在海洋上發光
 *
 * @param geom 已位移的 SphereGeometry
 * @param heightmap 256×128 灰階 buffer（與 buildDisplacedSphere 同一張）
 * @param threshold 海洋閾值（0-255），預設 50
 * @param liftAbove 把點稍微推出表面（避免與 mesh z-fight），預設 1.005×
 * @returns Float32Array of [x,y,z, x,y,z, ...] 海洋頂點位置
 */
export function extractOceanPositions(
  geom: THREE.SphereGeometry,
  heightmap: Uint8ClampedArray,
  threshold = 50,
  liftAbove = 1.005,
): Float32Array {
  const pos = geom.attributes.position;
  const oceanCoords: number[] = [];

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + y * y + z * z) || 1;

    // 換算 lat/lng（與 buildDisplacedSphere 內邏輯一致）
    const phi = Math.acos(y / r);
    const theta = Math.atan2(z, -x);
    const lat = 90 - (phi * 180) / Math.PI;
    const lng = ((theta * 180) / Math.PI) - 180;

    const u = (lng + 180) / 360;
    const v = (90 - lat) / 180;

    const sample = bilinearSample(heightmap, HEIGHTMAP_W, HEIGHTMAP_H, u, v);
    if (sample < threshold) {
      // 海洋頂點：以原方向推到 liftAbove 半徑（基本上是 1.005 球面）
      oceanCoords.push((x / r) * liftAbove, (y / r) * liftAbove, (z / r) * liftAbove);
    }
  }

  return new Float32Array(oceanCoords);
}

export function buildDisplacedSphere(heightmap: Uint8ClampedArray): THREE.SphereGeometry {
  const geom = new THREE.SphereGeometry(1, SPHERE_SEGMENTS_W, SPHERE_SEGMENTS_H);
  const pos = geom.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // 球面笛卡兒 → lat/lng
    // 注意：座標系跟 latLngToVec3 反推一致
    //   latLngToVec3(lat, lng) = (-sin(phi)*cos(theta), cos(phi), sin(phi)*sin(theta))
    //   其中 phi = (90-lat)*π/180, theta = (lng+180)*π/180
    const phi = Math.acos(y); // 0 ~ π
    const theta = Math.atan2(z, -x); // -π ~ π
    const lat = 90 - (phi * 180) / Math.PI;
    const lng = ((theta * 180) / Math.PI) - 180;

    // lat/lng → heightmap UV（0~1）
    const u = (lng + 180) / 360;
    const v = (90 - lat) / 180;

    const sample = bilinearSample(heightmap, HEIGHTMAP_W, HEIGHTMAP_H, u, v) / 255;

    // 步驟 1：海岸 ledge — smoothstep 在 0.3-0.7 區間做銳利轉換
    //   結果：海洋平坦（低位移）→ 海岸驟升 → 大陸基底（5% 半徑）
    //   呈現「板塊式」邊界而非緩坡漸變
    let ledge: number;
    if (sample < 0.3) {
      ledge = 0;
    } else if (sample > 0.7) {
      ledge = 1;
    } else {
      const ts = (sample - 0.3) / 0.4;
      ledge = ts * ts * (3 - 2 * ts); // smoothstep
    }
    const baseDisplace = ledge * DISPLACE_MAX;

    // 步驟 2：大陸上加多尺度 mountain noise
    //   noiseFactor：sample > 0.5 才有山脈，避免海岸鋸齒
    //   負值 noise 也接受（盆地：低於大陸平均，但仍高於海洋）
    const noiseFactor = Math.max(0, (sample - 0.5) / 0.5);
    const mountainExtra = mountainNoise(x, y, z) * MOUNTAIN_AMP * noiseFactor;
    // mountainExtra 可以是負的（盆地），但我們 clamp 不會低於 ledge（海平面）
    const totalDisplace = Math.max(0, baseDisplace + mountainExtra);

    const newR = 1 + totalDisplace;

    // 往外推：保持單位向量方向
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    pos.setXYZ(i, (x / len) * newR, (y / len) * newR, (z / len) * newR);
  }

  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/**
 * 從 displaced sphere 自動生成「對齊 mesh polygon」的海岸線
 *
 * 為什麼不用 GeoJSON 直接畫？
 *   GeoJSON 解析度遠高於 sphere mesh（96×60 ≈ 5800 vertex），所以 GeoJSON
 *   畫出的線跟 mesh polygon 邊永遠對不上 → 視覺上「線浮在大陸外」
 *
 * 解法：從 mesh 自身找出 land/ocean 跨界 face，畫出這些 face 的邊
 *   結果天生對齊 mesh 多邊形，呈現「板塊式低多邊形邊界」
 *
 * 演算法：
 *   1. 對每個 vertex 用 heightmap 標記 land(1) / ocean(0)
 *   2. 遍歷所有 face triangles，找出 vertex 狀態混合（一端 land、另一端 ocean）的邊
 *   3. 用 edgeKey 去重（同一條邊會出現在兩個 face 上）
 *   4. 把這些邊的兩端推到 liftRadius 半徑（避免 z-fight），輸出 BufferGeometry
 *
 * @param geom 已位移的 SphereGeometry
 * @param heightmap 256×128 灰階 buffer
 * @param threshold 0~255，sample > threshold 視為 land
 * @param liftRadius 半徑（略大於最高位移 1.085 → 用 1.092）
 */
export function buildCoastlineEdges(
  geom: THREE.SphereGeometry,
  heightmap: Uint8ClampedArray,
  threshold = 100,
  liftRadius = 1.092,
): THREE.BufferGeometry {
  const pos = geom.attributes.position;
  const indices = geom.index;
  if (!indices) {
    throw new Error("buildCoastlineEdges: geom must be indexed");
  }

  // Step 1：對每個 vertex 標 land/ocean
  const isLand = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + y * y + z * z) || 1;
    const phi = Math.acos(y / r);
    const theta = Math.atan2(z, -x);
    const lat = 90 - (phi * 180) / Math.PI;
    const lng = ((theta * 180) / Math.PI) - 180;
    const u = (lng + 180) / 360;
    const v = (90 - lat) / 180;
    const sample = bilinearSample(heightmap, HEIGHTMAP_W, HEIGHTMAP_H, u, v);
    isLand[i] = sample > threshold ? 1 : 0;
  }

  // Step 2：遍歷 face triangles，找跨界邊
  const edgeSet = new Set<string>();
  const edgePoints: number[] = [];

  const idxArr = indices.array as Uint16Array | Uint32Array;
  for (let i = 0; i < idxArr.length; i += 3) {
    const a = idxArr[i];
    const b = idxArr[i + 1];
    const c = idxArr[i + 2];

    // 三條邊
    const edges: [number, number][] = [[a, b], [b, c], [c, a]];
    for (const [v1, v2] of edges) {
      // 跨界判定：兩端 land/ocean 狀態不同
      if (isLand[v1] === isLand[v2]) continue;
      // 去重：用 sorted vertex index 當 key
      const lo = Math.min(v1, v2);
      const hi = Math.max(v1, v2);
      const key = `${lo}-${hi}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);

      // 把兩端 vertex 推到 liftRadius 半徑（保持單位向量方向）
      for (const v of [v1, v2]) {
        const x = pos.getX(v);
        const y = pos.getY(v);
        const z = pos.getZ(v);
        const r = Math.sqrt(x * x + y * y + z * z) || 1;
        edgePoints.push(
          (x / r) * liftRadius,
          (y / r) * liftRadius,
          (z / r) * liftRadius,
        );
      }
    }
  }

  // Step 3：建立 LineSegments BufferGeometry
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(edgePoints, 3));
  return g;
}
