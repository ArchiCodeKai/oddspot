"use client";

import { motion } from "framer-motion";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotMapPoint } from "@/types/spots";
import { cursorState } from "@/lib/cursor-state";

interface SpotMarkerProps {
  spot: SpotMapPoint;
  isSelected: boolean;
  zoom: number;
  onClick: (spot: SpotMapPoint) => void;
}

// 依 zoom 決定 pin 視覺尺寸（v3：放大讓 glyph 看得清）
function getPinScale(zoom: number, isSelected: boolean): number {
  if (zoom <= 11) return isSelected ? 0.85 : 0.6;
  if (zoom <= 13) return isSelected ? 1.1 : 0.85;
  return isSelected ? 1.25 : 1;
}

// zoom < 12 時顯示呼吸脈衝（表示「有東西藏在這裡」）
const PULSE_VARIANTS = {
  animate: {
    scale: [1, 2.4],
    opacity: [0.4, 0],
  },
};

export function SpotMarker({ spot, isSelected, zoom, onClick }: SpotMarkerProps) {
  // v3 monochrome：pin 一律 accent 色，類別靠 glyph 形狀識別
  const Glyph = CATEGORY_GLYPHS[spot.category as SpotCategory];
  const showPulse = zoom <= 11 && !isSelected;
  const pinScale = getPinScale(zoom, isSelected);

  const handleClick = () => {
    onClick(spot);

    // 精準指標設備才派發飛行箭頭事件
    if (typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches) {
      window.dispatchEvent(
        new CustomEvent("oddspot:markerclick", {
          detail: {
            targetX: cursorState.pos.x,
            targetY: cursorState.pos.y,
          },
        })
      );
    }
  };

  return (
    <AdvancedMarker
      position={{ lat: spot.lat, lng: spot.lng }}
      onClick={handleClick}
    >
      {/* 外層確保行動端 tap target 至少 44×44px */}
      <div
        style={{
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {/* 相對容器：pulse ring 與 pin 疊放 */}
        <div style={{ position: "relative", width: 28, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>

          {/* 呼吸脈衝環（低縮放時） */}
          {showPulse && (
            <motion.div
              variants={PULSE_VARIANTS}
              animate="animate"
              transition={{
                duration: 2.4,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 0.8,
              }}
              style={{
                position: "absolute",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "rgb(var(--accent-rgb))",
                pointerEvents: "none",
              }}
            />
          )}

          {/* 主 pin：teardrop 輪廓 + glyph，用 accent 一色 */}
          <motion.div
            animate={{ scale: pinScale }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            style={{
              position: "relative",
              width: 28,
              height: 34,
              filter: isSelected
                ? "drop-shadow(0 0 10px rgb(var(--accent-rgb) / 0.9))"
                : "drop-shadow(0 0 5px rgb(var(--accent-rgb) / 0.45))",
              transition: "filter 0.15s",
            }}
          >
            <svg
              width="28"
              height="34"
              viewBox="0 0 28 34"
              fill="none"
              style={{ display: "block" }}
            >
              <path
                d="M14 2 C20 2, 25 7, 25 13 C25 20, 14 32, 14 32 C14 32, 3 20, 3 13 C3 7, 8 2, 14 2 Z"
                fill="rgb(var(--background-rgb))"
                stroke={isSelected ? "rgb(var(--accent-rgb))" : "rgb(var(--accent-rgb) / 0.85)"}
                strokeWidth={isSelected ? 1.8 : 1.5}
              />
            </svg>
            {/* glyph 疊在 pin 圓頭中心 */}
            <div
              style={{
                position: "absolute",
                top: 4,
                left: 5,
                width: 18,
                height: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgb(var(--accent-rgb))",
                pointerEvents: "none",
              }}
            >
              <Glyph size={12} />
            </div>
          </motion.div>
        </div>
      </div>
    </AdvancedMarker>
  );
}
