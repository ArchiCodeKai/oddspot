import * as THREE from "three";

// ─── 等高線密度配置（之後想調這裡改數字就好）────────────────────────────
//
// 設計原理：
//   每座山脈用「同心球面小圓」表示等高線
//   levels 越多 = 等高線越密 = 視覺像更精細的測繪圖
//   innerRadiusDeg / outerRadiusDeg = 最內圈 / 最外圈的角距離（球面度）
//   越小越窄 → 山脈越「集中」；越大越散 → 山脈越「廣闊」
//
// CONTOUR_CONFIG 是匯出常數，使用方便調整：
//   import { CONTOUR_CONFIG } from "./buildContours";
//   CONTOUR_CONFIG.taiwan.levels = 10;  // 想要更多台灣等高線就改這裡
//
// ─────────────────────────────────────────────────────────────────────────

export interface ContourMountainSpec {
  name: string;
  lat: number;
  lng: number;
  /** 最內圈半徑（球面角距離 度，越小越靠近山頂） */
  innerRadiusDeg: number;
  /** 最外圈半徑（球面角距離 度，山腳邊緣） */
  outerRadiusDeg: number;
  /** 等高線數量（級別數）— 越多越密 */
  levels: number;
}

export const CONTOUR_CONFIG = {
  // ─── 台灣等高線（OddSpot 重點，視覺更密更亮）──────────────────────
  taiwan: {
    name: "Central Mountain Range",
    lat: 23.7,        // 中央山脈中心
    lng: 121.0,
    innerRadiusDeg: 0.4,   // 最內圈：核心山區
    outerRadiusDeg: 1.4,   // 最外圈：覆蓋整個台灣
    levels: 6,             // 6 條等高線（最內到最外均勻分布）
  } as ContourMountainSpec,

  // ─── 全球主要山脈（較稀疏，給「全球測繪」感）─────────────────────
  global: [
    {
      name: "Himalayas",
      lat: 28, lng: 86,
      innerRadiusDeg: 3, outerRadiusDeg: 11,
      levels: 4,
    },
    {
      name: "Andes",
      lat: -15, lng: -72,
      innerRadiusDeg: 4, outerRadiusDeg: 16,
      levels: 4,
    },
    {
      name: "Rockies",
      lat: 43, lng: -110,
      innerRadiusDeg: 3, outerRadiusDeg: 12,
      levels: 3,
    },
    {
      name: "Alps",
      lat: 46, lng: 10,
      innerRadiusDeg: 1.5, outerRadiusDeg: 6,
      levels: 3,
    },
    {
      name: "EastAfricanRift",
      lat: 0, lng: 37,
      innerRadiusDeg: 2, outerRadiusDeg: 9,
      levels: 3,
    },
    {
      name: "Caucasus",
      lat: 42.5, lng: 44,
      innerRadiusDeg: 1.5, outerRadiusDeg: 5,
      levels: 2,
    },
  ] as ContourMountainSpec[],

  // 視覺參數
  taiwanLineOpacity: 0.95,
  taiwanLineHeightOffset: 1.022,  // 台灣等高線稍微抬高，避免被海岸線蓋住
  globalLineOpacity: 0.45,
  globalLineHeightOffset: 1.020,
  segmentsPerCircle: 96,           // 每條等高線用 96 段渲染（圓滑）
};

// ─── 球面小圓 vertex 生成 ─────────────────────────────────────────
// 在球面上畫一個以 (centerLat, centerLng) 為中心、angularRadiusDeg 為半徑的圓
// 演算法：
//   1. 中心 unit vector = c
//   2. 找切平面上兩個正交基底 t1, t2
//   3. 圓上每點 = c·cos(R) + (t1·cos(α) + t2·sin(α))·sin(R)
//      其中 R 是球面半徑（弧度），α 是圓週上的角度
//
// 用 LineSegments 輸出（每對 p1, p2 是一段）
function pushSmallCirclePoints(
  out: number[],
  centerLat: number,
  centerLng: number,
  angularRadiusDeg: number,
  radius: number,
  segments: number,
): void {
  const phi   = ((90 - centerLat) * Math.PI) / 180;
  const theta = ((centerLng + 180) * Math.PI) / 180;
  // 中心 unit vector（與 latLngToVec3 同 convention）
  const cx = -Math.sin(phi) * Math.cos(theta);
  const cy =  Math.cos(phi);
  const cz =  Math.sin(phi) * Math.sin(theta);

  const center = new THREE.Vector3(cx, cy, cz);
  // 找切平面正交基底：用 world up 跟 center 叉積
  const worldUp = new THREE.Vector3(0, 1, 0);
  let t1 = new THREE.Vector3().crossVectors(worldUp, center);
  if (t1.lengthSq() < 1e-6) {
    // 極點 fallback
    t1 = new THREE.Vector3(1, 0, 0);
  }
  t1.normalize();
  const t2 = new THREE.Vector3().crossVectors(center, t1).normalize();

  const R = (angularRadiusDeg * Math.PI) / 180;
  const sinR = Math.sin(R);
  const cosR = Math.cos(R);

  // 預生成所有頂點再串成 LineSegments（每點重複用：上一段尾、這段頭）
  const ringPts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    const offX = sinR * (Math.cos(a) * t1.x + Math.sin(a) * t2.x);
    const offY = sinR * (Math.cos(a) * t1.y + Math.sin(a) * t2.y);
    const offZ = sinR * (Math.cos(a) * t1.z + Math.sin(a) * t2.z);
    const px = (cx * cosR + offX) * radius;
    const py = (cy * cosR + offY) * radius;
    const pz = (cz * cosR + offZ) * radius;
    ringPts.push(new THREE.Vector3(px, py, pz));
  }
  // 串成 LineSegments：(p0,p1), (p1,p2), ..., (pN-1, pN)
  for (let i = 0; i < ringPts.length - 1; i++) {
    const a = ringPts[i];
    const b = ringPts[i + 1];
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
}

interface BuildContoursResult {
  /** 台灣等高線（OddSpot 重點，主視覺） */
  taiwan: THREE.BufferGeometry;
  /** 全球主要山脈等高線 */
  global: THREE.BufferGeometry;
}

/**
 * 生成等高線 LineSegments BufferGeometry
 *
 * 視覺：
 *   每座山脈渲染成多層同心球面圓（從山頂往山腳擴散）
 *   越靠中心 = 越高 = 越亮
 *   像 1990s 軍用測繪圖 / NOAA 地形圖
 */
export function buildContours(): BuildContoursResult {
  // ─── 台灣 ──────────────────────────────────────────────────────
  const tw = CONTOUR_CONFIG.taiwan;
  const taiwanSegs: number[] = [];
  for (let l = 0; l < tw.levels; l++) {
    // levels 從內到外均勻分布
    const t = tw.levels === 1 ? 0 : l / (tw.levels - 1);
    const radiusDeg = tw.innerRadiusDeg + (tw.outerRadiusDeg - tw.innerRadiusDeg) * t;
    pushSmallCirclePoints(
      taiwanSegs,
      tw.lat, tw.lng,
      radiusDeg,
      CONTOUR_CONFIG.taiwanLineHeightOffset,
      CONTOUR_CONFIG.segmentsPerCircle,
    );
  }

  // ─── 全球山脈 ──────────────────────────────────────────────────
  const globalSegs: number[] = [];
  for (const m of CONTOUR_CONFIG.global) {
    for (let l = 0; l < m.levels; l++) {
      const t = m.levels === 1 ? 0 : l / (m.levels - 1);
      const radiusDeg = m.innerRadiusDeg + (m.outerRadiusDeg - m.innerRadiusDeg) * t;
      pushSmallCirclePoints(
        globalSegs,
        m.lat, m.lng,
        radiusDeg,
        CONTOUR_CONFIG.globalLineHeightOffset,
        CONTOUR_CONFIG.segmentsPerCircle,
      );
    }
  }

  const taiwanGeom = new THREE.BufferGeometry();
  taiwanGeom.setAttribute("position", new THREE.Float32BufferAttribute(taiwanSegs, 3));

  const globalGeom = new THREE.BufferGeometry();
  globalGeom.setAttribute("position", new THREE.Float32BufferAttribute(globalSegs, 3));

  return { taiwan: taiwanGeom, global: globalGeom };
}
