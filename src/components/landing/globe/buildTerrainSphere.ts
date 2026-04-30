import * as THREE from "three";
import { bilinearSample, latLngToVec3 } from "./geoUtils";
import { mountainElevation } from "./buildLandPoints";

const HEIGHTMAP_W = 256;
const HEIGHTMAP_H = 128;

const TERRAIN_BASE_RADIUS = 1.008;
// 起伏加大：板塊厚度 +40%、山脈位移 +40%，讓地形「劇力」一點
const LAND_BASE_DISPLACEMENT = 0.034;
const ELEVATION_DISPLACEMENT = 0.054;
const MOUNTAIN_SCALE = 3.0;
const HEIGHTMAP_LAND_THRESHOLD = 100;
const LAND_THRESHOLD_NORM = HEIGHTMAP_LAND_THRESHOLD / 255;
const MAX_VISUAL_ELEVATION = 0.110;

interface BuildTerrainSphereOptions {
  heightmap: Uint8ClampedArray;
  segmentsW?: number;
  segmentsH?: number;
}

export interface TerrainSphereResult {
  /** Full displaced sphere. Shader uses aLandFactor to draw land only. */
  meshGeometry: THREE.BufferGeometry;
  /** Heightmap-derived terrain contours inside continents. */
  wireGeometry: THREE.BufferGeometry;
  /** Heightmap contour coastline, independent from triangle edges. */
  coastlineGeometry: THREE.BufferGeometry;
  /** Higher-elevation ridge contours for mountain/highland emphasis. */
  ridgeGeometry: THREE.BufferGeometry;
  meshUnitVecs: Float32Array;
  meshBaseRadii: Float32Array;
  wireUnitVecs: Float32Array;
  wireBaseRadii: Float32Array;
  coastlineUnitVecs: Float32Array;
  coastlineBaseRadii: Float32Array;
  ridgeUnitVecs: Float32Array;
  ridgeBaseRadii: Float32Array;
}

interface DynamicGeometry {
  geometry: THREE.BufferGeometry;
  unitVecs: Float32Array;
  baseRadii: Float32Array;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function proceduralRelief(lat: number, lng: number): number {
  // 三倍頻率 + 振幅加強，讓陸地內部變化更密、更接近真實地形分布
  const lo =
    Math.sin(lat * 0.18 + lng * 0.10) * 0.42 +
    Math.cos(lat * 0.13 - lng * 0.16) * 0.32;
  const mid =
    Math.sin((lat + lng) * 0.34) * 0.24 +
    Math.cos((lat * 2.4 - lng) * 0.18) * 0.20;
  // 新增 hi-frequency layer：山脈/盆地的細節
  const hi =
    Math.sin((lat * 3.1 + lng * 2.6) * 0.55) * 0.14 +
    Math.cos((lat * 4.3 - lng * 3.7) * 0.42) * 0.10;
  return Math.max(0, Math.min(1, 0.5 + lo + mid + hi));
}

function sampleTerrainInfo(heightmap: Uint8ClampedArray, lat: number, lng: number): {
  landFactor: number;
  elevationNorm: number;
  radius: number;
} {
  const u = (lng + 180) / 360;
  const v = (90 - lat) / 180;
  const landSample = bilinearSample(heightmap, HEIGHTMAP_W, HEIGHTMAP_H, u, v) / 255;

  // Narrow transition: enough antialiasing, but visually still a clear coast.
  const landFactor = smoothstep(LAND_THRESHOLD_NORM - 0.025, LAND_THRESHOLD_NORM + 0.045, landSample);
  const mountainNorm = Math.max(
    0,
    Math.min(1, (mountainElevation(lat, lng) * MOUNTAIN_SCALE) / MAX_VISUAL_ELEVATION),
  );
  const relief = proceduralRelief(lat, lng);
  const elevationNorm = landFactor * Math.max(0, Math.min(1, 0.12 + relief * 0.30 + mountainNorm * 0.62));
  const radius =
    TERRAIN_BASE_RADIUS +
    landFactor * LAND_BASE_DISPLACEMENT +
    elevationNorm * ELEVATION_DISPLACEMENT;

  return { landFactor, elevationNorm, radius };
}

function gridToLatLng(x: number, y: number, w: number, h: number): { lat: number; lng: number } {
  return {
    lat: 90 - (y / (h - 1)) * 180,
    lng: (x / (w - 1)) * 360 - 180,
  };
}

function pushPoint(
  positions: number[],
  unitVecs: number[],
  baseRadii: number[],
  heightmap: Uint8ClampedArray,
  x: number,
  y: number,
  w: number,
  h: number,
  lift: number,
): void {
  const { lat, lng } = gridToLatLng(x, y, w, h);
  const { radius } = sampleTerrainInfo(heightmap, lat, lng);
  const p = latLngToVec3(lat, lng, 1);
  positions.push(p.x * (radius + lift), p.y * (radius + lift), p.z * (radius + lift));
  unitVecs.push(p.x, p.y, p.z);
  baseRadii.push(radius + lift);
}

function buildContourGeometry(
  field: Float32Array,
  width: number,
  height: number,
  levels: number[],
  heightmap: Uint8ClampedArray,
  lift: number,
): DynamicGeometry {
  const positions: number[] = [];
  const unitVecs: number[] = [];
  const baseRadii: number[] = [];

  const addIntersection = (
    out: { x: number; y: number }[],
    x1: number,
    y1: number,
    v1: number,
    x2: number,
    y2: number,
    v2: number,
    iso: number,
  ) => {
    if ((v1 < iso && v2 < iso) || (v1 > iso && v2 > iso) || v1 === v2) return;
    const t = Math.max(0, Math.min(1, (iso - v1) / (v2 - v1)));
    out.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  };

  for (const iso of levels) {
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const tl = field[y * width + x];
        const tr = field[y * width + x + 1];
        const br = field[(y + 1) * width + x + 1];
        const bl = field[(y + 1) * width + x];
        const hits: { x: number; y: number }[] = [];

        addIntersection(hits, x, y, tl, x + 1, y, tr, iso);
        addIntersection(hits, x + 1, y, tr, x + 1, y + 1, br, iso);
        addIntersection(hits, x + 1, y + 1, br, x, y + 1, bl, iso);
        addIntersection(hits, x, y + 1, bl, x, y, tl, iso);

        if (hits.length === 2) {
          pushPoint(positions, unitVecs, baseRadii, heightmap, hits[0].x, hits[0].y, width, height, lift);
          pushPoint(positions, unitVecs, baseRadii, heightmap, hits[1].x, hits[1].y, width, height, lift);
        } else if (hits.length === 4) {
          pushPoint(positions, unitVecs, baseRadii, heightmap, hits[0].x, hits[0].y, width, height, lift);
          pushPoint(positions, unitVecs, baseRadii, heightmap, hits[1].x, hits[1].y, width, height, lift);
          pushPoint(positions, unitVecs, baseRadii, heightmap, hits[2].x, hits[2].y, width, height, lift);
          pushPoint(positions, unitVecs, baseRadii, heightmap, hits[3].x, hits[3].y, width, height, lift);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return {
    geometry,
    unitVecs: new Float32Array(unitVecs),
    baseRadii: new Float32Array(baseRadii),
  };
}

function buildFields(heightmap: Uint8ClampedArray): {
  landField: Float32Array;
  elevationField: Float32Array;
  ridgeField: Float32Array;
} {
  const landField = new Float32Array(HEIGHTMAP_W * HEIGHTMAP_H);
  const elevationField = new Float32Array(HEIGHTMAP_W * HEIGHTMAP_H);
  const ridgeField = new Float32Array(HEIGHTMAP_W * HEIGHTMAP_H);

  for (let y = 0; y < HEIGHTMAP_H; y++) {
    for (let x = 0; x < HEIGHTMAP_W; x++) {
      const { lat, lng } = gridToLatLng(x, y, HEIGHTMAP_W, HEIGHTMAP_H);
      const i = y * HEIGHTMAP_W + x;
      const { landFactor, elevationNorm } = sampleTerrainInfo(heightmap, lat, lng);
      landField[i] = heightmap[i] / 255;
      elevationField[i] = elevationNorm;
      ridgeField[i] = landFactor * Math.max(
        0,
        Math.min(1, (mountainElevation(lat, lng) * MOUNTAIN_SCALE) / MAX_VISUAL_ELEVATION),
      );
    }
  }

  return { landField, elevationField, ridgeField };
}

/**
 * Builds the mobile earth terrain:
 * - a full displaced sphere with land/elevation attributes for masked fill
 * - coastline from marching-squares over the heightmap, so it is smoother than triangle edges
 * - elevation/ridge contours for visible mountain, highland, and basin structure
 */
export function buildTerrainSphere({
  heightmap,
  segmentsW = 144,
  segmentsH = 72,
}: BuildTerrainSphereOptions): TerrainSphereResult {
  const sphere = new THREE.SphereGeometry(1, segmentsW, segmentsH);
  const positions = sphere.attributes.position.array as Float32Array;
  const vertexCount = positions.length / 3;
  const landFactors = new Float32Array(vertexCount);
  const elevations = new Float32Array(vertexCount);
  const meshUnitVecs = new Float32Array(positions.length);
  const meshBaseRadii = new Float32Array(vertexCount);

  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    const ux = positions[i3];
    const uy = positions[i3 + 1];
    const uz = positions[i3 + 2];
    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, uy))) * 180) / Math.PI;
    const lng = ((Math.atan2(uz, -ux) * 180) / Math.PI) - 180;
    const { landFactor, elevationNorm, radius } = sampleTerrainInfo(heightmap, lat, lng);

    positions[i3] = ux * radius;
    positions[i3 + 1] = uy * radius;
    positions[i3 + 2] = uz * radius;
    landFactors[i] = landFactor;
    elevations[i] = elevationNorm;
    meshUnitVecs[i3] = ux;
    meshUnitVecs[i3 + 1] = uy;
    meshUnitVecs[i3 + 2] = uz;
    meshBaseRadii[i] = radius;
  }

  sphere.setAttribute("aLandFactor", new THREE.BufferAttribute(landFactors, 1));
  sphere.setAttribute("aElevation", new THREE.BufferAttribute(elevations, 1));
  sphere.computeBoundingSphere();
  sphere.computeVertexNormals();

  const { landField, elevationField, ridgeField } = buildFields(heightmap);
  const coastline = buildContourGeometry(
    landField,
    HEIGHTMAP_W,
    HEIGHTMAP_H,
    [LAND_THRESHOLD_NORM],
    heightmap,
    0.010,
  );
  const contour = buildContourGeometry(
    elevationField,
    HEIGHTMAP_W,
    HEIGHTMAP_H,
    [0.30, 0.42, 0.54, 0.66],
    heightmap,
    0.014,
  );
  const ridge = buildContourGeometry(
    ridgeField,
    HEIGHTMAP_W,
    HEIGHTMAP_H,
    [0.22, 0.38, 0.56],
    heightmap,
    0.018,
  );

  return {
    meshGeometry: sphere,
    wireGeometry: contour.geometry,
    coastlineGeometry: coastline.geometry,
    ridgeGeometry: ridge.geometry,
    meshUnitVecs,
    meshBaseRadii,
    wireUnitVecs: contour.unitVecs,
    wireBaseRadii: contour.baseRadii,
    coastlineUnitVecs: coastline.unitVecs,
    coastlineBaseRadii: coastline.baseRadii,
    ridgeUnitVecs: ridge.unitVecs,
    ridgeBaseRadii: ridge.baseRadii,
  };
}
