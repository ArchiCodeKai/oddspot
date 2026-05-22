"use client";

import { motion } from "framer-motion";
import { Marker } from "react-map-gl/mapbox";
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

// 依 zoom 決定 marker 視覺尺寸（雷達定位點 base 24px）
function getMarkerScale(zoom: number, isSelected: boolean): number {
  if (zoom <= 11) return isSelected ? 0.85 : 0.6;
  if (zoom <= 13) return isSelected ? 1.1 : 0.85;
  return isSelected ? 1.25 : 1;
}

// zoom < 12 時的呼吸脈衝（暗示「有東西藏在這裡」）
const PULSE_VARIANTS = {
  animate: {
    scale: [1, 2.4],
    opacity: [0.4, 0],
  },
};

export function SpotMarker({ spot, isSelected, zoom, onClick }: SpotMarkerProps) {
  const Glyph = CATEGORY_GLYPHS[spot.category as SpotCategory];
  const showPulse = zoom <= 11 && !isSelected;
  const markerScale = getMarkerScale(zoom, isSelected);

  // mapbox-gl click 事件會冒泡到 Map 觸發 deselect，必須擋住
  const handleClick = (e: { originalEvent: { stopPropagation: () => void } }) => {
    e.originalEvent.stopPropagation();
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
    <Marker
      longitude={spot.lng}
      latitude={spot.lat}
      // anchor center：定位點圓心對齊座標點
      anchor="center"
      onClick={handleClick}
    >
      {/* 外層 44×44 確保行動端 tap target */}
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
        {/* 相對容器：pulse ring 與 marker 疊放 */}
        <div
          style={{
            position: "relative",
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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

          {/* 雷達定位點 marker（acid 雷達 ping 風） */}
          <motion.div
            animate={{ scale: markerScale }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            style={{
              position: "relative",
              width: 24,
              height: 24,
              color: "rgb(var(--accent-rgb))",
              filter: isSelected
                ? "drop-shadow(0 0 10px rgb(var(--accent-rgb) / 0.9))"
                : "drop-shadow(0 0 5px rgb(var(--accent-rgb) / 0.45))",
              transition: "filter 0.15s",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="-12 -12 24 24"
              fill="none"
              stroke="currentColor"
              style={{ display: "block" }}
            >
              {/* 背景圓（半透明 bg，讓 glyph 在地圖上不糊） */}
              <circle r="10" fill="rgb(var(--background-rgb) / 0.85)" stroke="none" />

              {/* 外圈（實線，archive 邊界） */}
              <circle r="10" strokeWidth={isSelected ? 1 : 0.8} />

              {/* 內圈（dashed，雷達刻度感） */}
              <circle r="6" strokeWidth="0.5" strokeDasharray="2 1.5" opacity="0.7" />

              {/* 4 個 tick（12 / 3 / 6 / 9 點鐘外側，雷達座標標記） */}
              <line x1="0" y1="-11.5" x2="0" y2="-9" strokeWidth="0.8" />
              <line x1="0" y1="9" x2="0" y2="11.5" strokeWidth="0.8" />
              <line x1="-11.5" y1="0" x2="-9" y2="0" strokeWidth="0.8" />
              <line x1="9" y1="0" x2="11.5" y2="0" strokeWidth="0.8" />
            </svg>

            {/* 中央 glyph（category 識別） */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 8,
                height: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgb(var(--accent-rgb))",
                pointerEvents: "none",
              }}
            >
              <Glyph size={8} />
            </div>
          </motion.div>
        </div>
      </div>
    </Marker>
  );
}
