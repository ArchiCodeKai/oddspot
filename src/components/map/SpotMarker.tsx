"use client";

import { motion } from "framer-motion";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { CATEGORY_COLORS } from "@/lib/constants/categories";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotMapPoint } from "@/types/spots";
import { cursorState } from "@/lib/cursor-state";

interface SpotMarkerProps {
  spot: SpotMapPoint;
  isSelected: boolean;
  zoom: number;
  onClick: (spot: SpotMapPoint) => void;
}

// 依 zoom 決定點的視覺大小（以 scale 驅動，避免 layout repaint）
function getDotScale(zoom: number, isSelected: boolean): number {
  if (zoom <= 11) return isSelected ? 0.7 : 0.45;
  if (zoom <= 13) return isSelected ? 1.1 : 0.8;
  return isSelected ? 1.35 : 1;
}

// zoom < 12 時顯示呼吸脈衝（表示「有東西藏在這裡」）
const PULSE_VARIANTS = {
  animate: {
    scale: [1, 2.6],
    opacity: [0.5, 0],
  },
};

export function SpotMarker({ spot, isSelected, zoom, onClick }: SpotMarkerProps) {
  const color = CATEGORY_COLORS[spot.category as SpotCategory] ?? "#6b7280";
  const showPulse = zoom <= 11 && !isSelected;
  const dotScale = getDotScale(zoom, isSelected);

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
        {/* 相對容器：讓 pulse ring 和 dot 疊放 */}
        <div style={{ position: "relative", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>

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
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: color,
                pointerEvents: "none",
              }}
            />
          )}

          {/* 主點：縮放時 spring 過渡 */}
          <motion.div
            animate={{ scale: dotScale }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              backgroundColor: color,
              border: `2px solid ${isSelected ? "#fff" : "rgba(255,255,255,0.7)"}`,
              boxShadow: isSelected
                ? `0 0 0 3px ${color}55, 0 0 12px ${color}66`
                : zoom >= 14
                ? `0 0 6px ${color}44, 0 1px 4px rgba(0,0,0,0.3)`
                : "0 1px 3px rgba(0,0,0,0.25)",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
          />
        </div>
      </div>
    </AdvancedMarker>
  );
}
