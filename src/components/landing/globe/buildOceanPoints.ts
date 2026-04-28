import * as THREE from "three";
import { bilinearSample } from "./geoUtils";

const HEIGHTMAP_W = 256;
const HEIGHTMAP_H = 128;

interface BuildOceanPointsOptions {
  heightmap: Uint8ClampedArray;
  candidateCount?: number;
  /** sample < threshold 視為海洋 */
  threshold?: number;
  radius?: number;
}

/**
 * 抽出海洋位置 → 給 OceanTideGlow 用的 Points geometry
 *
 * Attributes：
 *   - position:     3D 座標（每幀會被 OceanTideGlow 改寫成 base + ripple displacement）
 *   - basePosition: 不變的原始位置（每幀的計算源頭，避免位移累加漂移）
 *   - color:        每幀依 ripple wave-front 寫入
 *
 * 點數從 3500 提高到 15000+ 才能讓 wave-front 有足夠粒子讀出弧形
 */
export function buildOceanPoints({
  heightmap,
  candidateCount = 15000,
  threshold = 100,
  radius = 1.003,
}: BuildOceanPointsOptions): THREE.BufferGeometry {
  const positions: number[] = [];

  for (let i = 0; i < candidateCount; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const theta = 2 * Math.PI * u1;
    const phi = Math.acos(2 * u2 - 1);

    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);

    const phiActual = Math.acos(y);
    const thetaActual = Math.atan2(z, -x);
    const lat = 90 - (phiActual * 180) / Math.PI;
    const lng = ((thetaActual * 180) / Math.PI) - 180;
    const uMap = (lng + 180) / 360;
    const vMap = (90 - lat) / 180;

    const sample = bilinearSample(heightmap, HEIGHTMAP_W, HEIGHTMAP_H, uMap, vMap);
    if (sample >= threshold) continue; // 陸地略過

    positions.push(x * radius, y * radius, z * radius);
  }

  const geom = new THREE.BufferGeometry();
  // position 會被 OceanTideGlow 每幀改寫
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  // basePosition 永遠是原始值 → 計算 displacement 時的源頭
  geom.setAttribute("basePosition", new THREE.Float32BufferAttribute(positions.slice(), 3));
  // color 由 OceanTideGlow 每幀寫入
  const colors = new Float32Array((positions.length / 3) * 3);
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geom;
}
