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

// 依 zoom 決定 marker 視覺尺寸（wireframe 球 base 24px）
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

// 經線自轉 CSS keyframe — 200+ markers 同時用 CSS 才不會卡（GPU 合成）
// 一份 rule，所有 marker 共用
const GLOBE_SPIN_CSS = `
@keyframes oddspot-marker-globe-spin {
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(360deg); }
}
.oddspot-marker-meridians {
  transform-origin: center;
  transform-box: fill-box;
  animation: oddspot-marker-globe-spin 20s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .oddspot-marker-meridians { animation: none; }
}
`;

// 確保 keyframe 只注入 head 一次（多個 marker 共用）
let keyframesInjected = false;
function ensureKeyframes() {
  if (typeof document === "undefined" || keyframesInjected) return;
  const style = document.createElement("style");
  style.setAttribute("data-oddspot-marker", "true");
  style.textContent = GLOBE_SPIN_CSS;
  document.head.appendChild(style);
  keyframesInjected = true;
}

export function SpotMarker({ spot, isSelected, zoom, onClick }: SpotMarkerProps) {
  ensureKeyframes();

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
      // anchor center：球心對齊座標點（vs 原本淚滴 pin 的 bottom 尖端）
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
        {/* 相對容器：pulse ring 與 globe 疊放 */}
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

          {/* Wireframe globe marker（跟 globe button 同視覺語言） */}
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
              strokeWidth={isSelected ? 0.9 : 0.7}
              style={{ display: "block" }}
            >
              {/* 球體背景（深色實心，讓 glyph 跟 wireframe 不糊在地圖上） */}
              <circle r="10" fill="rgb(var(--background-rgb) / 0.85)" stroke="none" />

              {/* 靜態：外圓 + 緯線 */}
              <circle r="10" />
              <ellipse cx="0" cy="0" rx="10" ry="3" />
              <ellipse cx="0" cy="-5" rx="8.5" ry="1.6" />
              <ellipse cx="0" cy="5" rx="8.5" ry="1.6" />

              {/* 動態：經線群（共用 CSS keyframe，GPU 加速） */}
              <g className="oddspot-marker-meridians">
                <ellipse cx="0" cy="0" rx="10" ry="10" />
                <ellipse cx="0" cy="0" rx="4" ry="10" />
              </g>
            </svg>

            {/* 中央 glyph（球體 surface 上的紋章） */}
            <div
              style={{
                position: "absolute",
                top: 7,
                left: 7,
                width: 10,
                height: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgb(var(--accent-rgb))",
                pointerEvents: "none",
              }}
            >
              <Glyph size={10} />
            </div>
          </motion.div>
        </div>
      </div>
    </Marker>
  );
}
