"use client";

import { useTranslations } from "next-intl";
import type { MapRef } from "react-map-gl/mapbox";
import { useMapStore } from "@/store/useMapStore";

const RADIUS_OPTIONS = [5, 10, 20, 50] as const;

// 各半徑對應的合適 zoom level — 切換半徑時讓地圖飛回使用者位置 + 合適縮放
const ZOOM_BY_RADIUS: Record<number, number> = {
  5: 13.5,
  10: 12.5,
  20: 11.5,
  50: 10,
};

interface RadiusToggleProps {
  mapRef: React.RefObject<MapRef | null>;
  userLocation: { lat: number; lng: number } | null;
}

// 半徑切換器（chip 群組）
// 點任一 chip → setRadius + 切回 radius mode + flyTo 使用者位置
// viewport 模式時所有 chip 都不 highlight（提示「你正在自由瀏覽」）
export function RadiusToggle({ mapRef, userLocation }: RadiusToggleProps) {
  const t = useTranslations("radius");
  const radius = useMapStore((s) => s.radius);
  const queryMode = useMapStore((s) => s.queryMode);
  const setRadius = useMapStore((s) => s.setRadius);
  const setQueryMode = useMapStore((s) => s.setQueryMode);

  const handleSelect = (km: number) => {
    setRadius(km);
    setQueryMode("radius");
    // 飛回使用者位置（若沒定位則停在當前 viewport，仍然套用新半徑邏輯）
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: ZOOM_BY_RADIUS[km] ?? 12,
        duration: 600,
      });
    }
  };

  return (
    <div
      className="flex items-center gap-0.5 p-1 backdrop-blur-md"
      style={{
        background: "var(--panel-glass)",
        border: "1px solid var(--line)",
        borderRadius: 2,
        boxShadow: "var(--shadow-glow)",
      }}
      role="radiogroup"
      aria-label={t("label")}
    >
      {RADIUS_OPTIONS.map((km) => {
        const isActive = queryMode === "radius" && km === radius;
        return (
          <button
            key={km}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={t("option", { km })}
            onClick={() => handleSelect(km)}
            className="transition-colors uppercase"
            style={{
              padding: "4px 8px",
              fontSize: 10,
              lineHeight: 1,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.14em",
              fontWeight: 700,
              borderRadius: 2,
              background: isActive ? "rgb(var(--accent-rgb) / 0.18)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--muted)",
              border: `1px solid ${isActive ? "rgb(var(--accent-rgb) / 0.45)" : "transparent"}`,
              cursor: "pointer",
            }}
          >
            {km}KM
          </button>
        );
      })}
    </div>
  );
}
