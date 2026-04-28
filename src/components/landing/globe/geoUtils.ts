import * as THREE from "three";

/**
 * 經緯度（degrees）→ 球面笛卡兒座標
 * @param lat 緯度（-90 ~ 90）
 * @param lng 經度（-180 ~ 180）
 * @param r 球面半徑
 */
export function latLngToVec3(lat: number, lng: number, r = 1): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/**
 * 球面笛卡兒座標 → equirectangular UV（0~1）
 * 配合 latLngToVec3 使用，採樣 heightmap 用
 */
export function vec3ToUv(x: number, y: number, z: number): { u: number; v: number } {
  const r = Math.sqrt(x * x + y * y + z * z);
  const lat = Math.asin(y / r);
  const lng = Math.atan2(z, -x);
  // 注意：latLngToVec3 用 (lng + 180) 做 theta，所以這裡反推回去
  const u = ((lng / Math.PI) * 0.5 + 0.5);
  const v = 1 - (lat / Math.PI + 0.5);
  return { u, v };
}

/**
 * 從 1D Uint8 heightmap 雙線性採樣
 * @param data heightmap 一維陣列（row-major）
 * @param w 寬度
 * @param h 高度
 * @param u 橫向 UV (0~1)
 * @param v 縱向 UV (0~1)
 * @returns 0~255 的 sample 值
 */
export function bilinearSample(
  data: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  u: number,
  v: number,
): number {
  // wrap u（經度循環），clamp v（緯度不循環）
  const uu = ((u % 1) + 1) % 1;
  const vv = Math.max(0, Math.min(1, v));

  const x = uu * (w - 1);
  const y = vv * (h - 1);

  const x0 = Math.floor(x);
  const x1 = Math.min(w - 1, x0 + 1);
  const y0 = Math.floor(y);
  const y1 = Math.min(h - 1, y0 + 1);

  const fx = x - x0;
  const fy = y - y0;

  const p00 = data[y0 * w + x0];
  const p10 = data[y0 * w + x1];
  const p01 = data[y1 * w + x0];
  const p11 = data[y1 * w + x1];

  const top = p00 * (1 - fx) + p10 * fx;
  const bot = p01 * (1 - fx) + p11 * fx;

  return top * (1 - fy) + bot * fy;
}

// GeoJSON 型別（最小子集）
export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][]; // rings[ring[[lng, lat], ...]]
}
export interface GeoJSONMultiPolygon {
  type: "MultiPolygon";
  coordinates: number[][][][]; // polygons[rings[ring[[lng, lat], ...]]]
}
export interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
  properties?: Record<string, unknown>;
}
export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * 走訪 GeoJSON 中所有 polygon ring（外環+內環），給 callback
 * 把 Polygon / MultiPolygon 統一處理
 */
export function forEachRing(
  fc: GeoJSONFeatureCollection,
  cb: (ring: number[][]) => void,
): void {
  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) cb(ring);
    } else if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates) {
        for (const ring of polygon) cb(ring);
      }
    }
  }
}
