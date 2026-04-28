import * as THREE from "three";

/**
 * 月球軌道路徑：完美圓形（離心率 0 簡化），位於 XZ 平面
 * 因為被 MoonOrbitGroup 包住、後者已套 5.14° 傾斜，這裡只要產生水平圓
 *
 * @param radius 軌道半徑（地球半徑的倍數）
 * @param segments 圓周分段數（越多越平滑）
 * @returns 連續線段 buffer geometry，給 <line> 用（不是 <lineSegments>）
 */
export function buildMoonOrbitRing(radius: number, segments: number = 96): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(t) * radius, 0, Math.sin(t) * radius);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geom;
}
