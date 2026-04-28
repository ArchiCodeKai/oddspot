"use client";

import * as THREE from "three";
import { latLngToVec3 } from "./geoUtils";

// City data nodes — 全球分佈的 sci-fi 節點，配合 city tag 暗示「資料覆蓋」
// Taiwan/Taipei 不在這裡（Taiwan pin 在 GlobeScene 已單獨處理）
// 顏色：白 / 金 兩款，搭配 land highlights 整體質感
const CITY_NODES: Array<{ lat: number; lng: number; color: "white" | "gold"; size: number }> = [
  { lat: 35.7,  lng: 139.7, color: "gold",  size: 0.018 }, // Tokyo
  { lat: 40.7,  lng: -74.0, color: "white", size: 0.018 }, // NYC
  { lat: 51.5,  lng: -0.1,  color: "white", size: 0.016 }, // London
  { lat: -33.9, lng: 151.2, color: "gold",  size: 0.016 }, // Sydney
  { lat: 1.3,   lng: 103.8, color: "white", size: 0.014 }, // Singapore
  { lat: -22.9, lng: -43.2, color: "gold",  size: 0.014 }, // Rio
  { lat: 19.4,  lng: -99.1, color: "white", size: 0.014 }, // Mexico City
  { lat: 55.8,  lng: 37.6,  color: "white", size: 0.014 }, // Moscow
];

const NODE_RADIUS_LIFT = 1.018; // 從地球表面（陸地 ~1.005 + jitter）再墊高一點

const COLOR_WHITE = new THREE.Color("#ffffff");
const COLOR_GOLD = new THREE.Color("#ffd87a");

interface CityNodesProps {
  /** 透明度乘數，配合 boot phase 用 */
  visibility?: number;
}

/**
 * 全球城市節點 — sci-fi 「資料覆蓋」感
 * 8 個 hand-picked lat/lng 位置，sphere + AdditiveBlending 自帶 glow
 *
 * 不會跟著 dissolve / earth rotation：當作一群子 mesh 渲染，
 * 因為它們應該存在於 earthSpinRef 內 → 跟著地球轉
 */
export function CityNodes({ visibility = 1 }: CityNodesProps) {
  return (
    <>
      {CITY_NODES.map((node, i) => {
        const pos = latLngToVec3(node.lat, node.lng, NODE_RADIUS_LIFT);
        const color = node.color === "gold" ? COLOR_GOLD : COLOR_WHITE;
        return (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[node.size, 10, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.95 * visibility}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </>
  );
}
