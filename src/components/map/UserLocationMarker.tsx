"use client";

import { motion } from "framer-motion";
import { Marker } from "react-map-gl/mapbox";

interface UserLocationMarkerProps {
  location: { lat: number; lng: number };
}

// Acid 風格「我在這」標記
// 結構：外圈脈衝 ring + 中圈靜態 ring + 中心點
// - 跟 SpotMarker 視覺有別（圓形 vs 淚滴形）
// - 始終用 var(--accent)，所有主題自動配色
export function UserLocationMarker({ location }: UserLocationMarkerProps) {
  return (
    <Marker longitude={location.lng} latitude={location.lat} anchor="center">
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          position: "relative",
          pointerEvents: "none",
        }}
      >
        {/* 外圈脈衝 ring — 1px wireframe，2s 一輪呼吸 */}
        <motion.span
          animate={{ scale: [0.5, 1.8], opacity: [0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1px solid rgb(var(--accent-rgb))",
            boxSizing: "border-box",
          }}
        />
        {/* 中圈靜態 ring */}
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 16,
            height: 16,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            border: "1.5px solid rgb(var(--accent-rgb))",
            background: "rgb(var(--background-rgb) / 0.55)",
            boxShadow: "0 0 10px rgb(var(--accent-rgb) / 0.65)",
            boxSizing: "border-box",
          }}
        />
        {/* 中心實心點 */}
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 5,
            height: 5,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "rgb(var(--accent-rgb))",
          }}
        />
      </div>
    </Marker>
  );
}
