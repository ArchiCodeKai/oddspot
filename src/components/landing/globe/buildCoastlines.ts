import * as THREE from "three";
import { latLngToVec3, type GeoJSONFeatureCollection } from "./geoUtils";

// ─── 台灣識別 bbox（lat/lng）─────────────────────────────────────
// ne_110m_land.json 解析度只有 110m 精度，台灣輪廓會是粗略多邊形
// 但仍能識別「這個 ring 屬於台灣」→ 走獨立 geometry，視覺更亮
const TAIWAN_BBOX = {
  latMin: 21.5,
  latMax: 25.5,
  lngMin: 119.5,
  lngMax: 122.5,
};

function isTaiwanRing(ring: number[][]): boolean {
  // 若 ring 的所有頂點都落在台灣 bbox 內，視為台灣
  // ne_110m 級別下，台灣是孤立的 polygon，bbox 判斷可靠
  if (ring.length < 3) return false;
  for (const [lng, lat] of ring) {
    if (lat < TAIWAN_BBOX.latMin || lat > TAIWAN_BBOX.latMax) return false;
    if (lng < TAIWAN_BBOX.lngMin || lng > TAIWAN_BBOX.lngMax) return false;
  }
  return true;
}

// ─── 從 GeoJSON 抽出 polygon rings（含 MultiPolygon 拆解） ────────
function* iterateRings(data: GeoJSONFeatureCollection): Generator<number[][]> {
  for (const feature of data.features) {
    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      // Polygon: coordinates = [outerRing, hole1, hole2, ...]
      // 海岸線只關心 outer ring（hole 是內陸湖泊，110m 精度沒這層級資料）
      yield geom.coordinates[0] as number[][];
    } else if (geom.type === "MultiPolygon") {
      // MultiPolygon: coordinates = [[outerRing, hole1, ...], [outerRing, ...], ...]
      for (const polygon of geom.coordinates as number[][][][]) {
        yield polygon[0] as number[][];
      }
    }
  }
}

interface BuildCoastlinesResult {
  /** 全球海岸線（不含台灣），LineSegments geometry */
  global: THREE.BufferGeometry;
  /** 台灣海岸線單獨一層，主視覺重點 */
  taiwan: THREE.BufferGeometry;
  /** 台灣每個頂點的 unit vector（球面 normal），D2 海岸線脈動每幀 CPU 算距離用 */
  taiwanUnitVecs: Float32Array;
}

/**
 * 從 GeoJSON 抽取海岸線 polylines，投影到球面 → LineSegments BufferGeometry
 *
 * 返回兩個 geometry：
 *   - global:  全球海岸線（OddSpot 範圍外，較淡）
 *   - taiwan:  台灣海岸線（OddSpot 範圍內，主視覺，更亮 + 可單獨做潮汐脈動）
 *
 * 用 LineSegments 而非 LineLoop：
 *   每對 (p1, p2) 是一段獨立線段，不需要前後連續
 *   一個 BufferGeometry 內包所有線段，只一個 draw call
 */
export function buildCoastlines(
  data: GeoJSONFeatureCollection,
  radius = 1.018,
): BuildCoastlinesResult {
  const globalSegs: number[] = [];
  const taiwanSegs: number[] = [];
  const taiwanVecs: number[] = [];

  for (const ring of iterateRings(data)) {
    const target = isTaiwanRing(ring) ? "taiwan" : "global";
    const segs = target === "taiwan" ? taiwanSegs : globalSegs;

    // 把 ring 的相鄰兩點轉成 LineSegments 的 (p1, p2) 對
    for (let i = 0; i < ring.length - 1; i++) {
      const [lng1, lat1] = ring[i];
      const [lng2, lat2] = ring[i + 1];
      const p1 = latLngToVec3(lat1, lng1, radius);
      const p2 = latLngToVec3(lat2, lng2, radius);
      segs.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);

      // 台灣每個頂點額外存球面 unit vector（D2 用）
      if (target === "taiwan") {
        const u1 = p1.clone().normalize();
        taiwanVecs.push(u1.x, u1.y, u1.z);
      }
    }
    // 補最後一個 ring 結束點的 unit vec
    if (target === "taiwan" && ring.length > 0) {
      const [lng, lat] = ring[ring.length - 1];
      const p = latLngToVec3(lat, lng, radius).normalize();
      taiwanVecs.push(p.x, p.y, p.z);
    }
  }

  const globalGeom = new THREE.BufferGeometry();
  globalGeom.setAttribute("position", new THREE.Float32BufferAttribute(globalSegs, 3));

  const taiwanGeom = new THREE.BufferGeometry();
  taiwanGeom.setAttribute("position", new THREE.Float32BufferAttribute(taiwanSegs, 3));
  // 台灣 geometry 額外含 vertex colors，給 D2 海岸線脈動每幀寫入
  const taiwanVertexCount = taiwanSegs.length / 3;
  taiwanGeom.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(new Float32Array(taiwanVertexCount * 3), 3),
  );

  return {
    global: globalGeom,
    taiwan: taiwanGeom,
    taiwanUnitVecs: new Float32Array(taiwanVecs),
  };
}
