import * as THREE from "three";

// ShaderMaterial 的 uniforms.value 可能掛 texture，material.dispose() 不會自動清
// 必須先把 uniforms 裡的 texture dispose 掉，再 dispose material 本身
export function disposeMaterial(
  material: THREE.Material | THREE.Material[] | null | undefined,
): void {
  if (!material) return;
  const list = Array.isArray(material) ? material : [material];
  for (const mat of list) {
    const uniforms = (mat as { uniforms?: Record<string, { value: unknown }> }).uniforms;
    if (uniforms) {
      for (const u of Object.values(uniforms)) {
        if (u?.value instanceof THREE.Texture) {
          u.value.dispose();
        }
      }
    }
    mat.dispose();
  }
}

// 安全 dispose：null/undefined 不會炸
export function disposeTexture(texture: THREE.Texture | null | undefined): void {
  if (texture) texture.dispose();
}

export function disposeGeometry(geometry: THREE.BufferGeometry | null | undefined): void {
  if (geometry) geometry.dispose();
}
