import * as THREE from "three";

let cachedTexture: THREE.Texture | null = null;

/**
 * 64×64 radial gradient texture，配 PointsMaterial map 使用 → 點變成柔和光斑
 * 解決原生 PointsMaterial 點是「方塊」的問題
 *
 * 模組共用一份（cached），所有點雲層共享
 */
export function getGlowPointTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  if (cachedTexture) return cachedTexture;

  const SIZE = 64;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE / 2);
  grd.addColorStop(0.0, "rgba(255,255,255,1.0)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.5)");
  grd.addColorStop(0.7, "rgba(255,255,255,0.12)");
  grd.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, SIZE, SIZE);

  cachedTexture = new THREE.CanvasTexture(canvas);
  cachedTexture.colorSpace = THREE.SRGBColorSpace;
  cachedTexture.minFilter = THREE.LinearFilter;
  cachedTexture.magFilter = THREE.LinearFilter;
  cachedTexture.needsUpdate = true;
  return cachedTexture;
}
