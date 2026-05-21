"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import type { MapRef } from "react-map-gl/mapbox";
import { useSpots } from "@/hooks/useSpots";
import { useMapStore } from "@/store/useMapStore";
import { MapView } from "@/components/map/MapView";
import { RadiusToggle } from "@/components/map/RadiusToggle";
import { SwipeView } from "@/components/swipe/SwipeView";
import { FilterSheet } from "@/components/swipe/FilterSheet";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { TopRightCluster } from "@/components/map/TopRightCluster";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";

const RADIUS_STEPS = [5, 10, 20, 50] as const;

type ViewMode = "map" | "swipe";

export default function MapPage() {
  const t = useTranslations("map");
  const tFilter = useTranslations("filter");
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [showFilter, setShowFilter] = useState(false);

  // mapRef 升到這層 — RadiusToggle / MapView / LocateMeButton 共用同一個 ref
  const mapRef = useRef<MapRef | null>(null);

  // 查詢條件來自 useMapStore（雙模式）
  const radius = useMapStore((s) => s.radius);
  const viewportBbox = useMapStore((s) => s.viewportBbox);
  const queryMode = useMapStore((s) => s.queryMode);
  const setRadius = useMapStore((s) => s.setRadius);
  const setQueryMode = useMapStore((s) => s.setQueryMode);
  const categories = useMapStore((s) => s.filters.categories);

  // 取得使用者定位（純 UI side effect，不屬於 server state）
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(null)
    );
  }, []);

  const { data, isLoading, isError } = useSpots({
    mode: queryMode,
    userLocation,
    radius,
    bbox: viewportBbox,
    categories,
  });
  const spots = data?.spots ?? [];
  const filterCount = categories?.length ?? 0;
  const filterActive = filterCount > 0;

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["spots"] });
  }, [queryClient]);

  // 空狀態時的 actions
  const handleExpandRadius = () => {
    const idx = (RADIUS_STEPS as readonly number[]).indexOf(radius);
    if (idx >= 0 && idx < RADIUS_STEPS.length - 1) {
      setRadius(RADIUS_STEPS[idx + 1]);
    }
  };
  const isMaxRadius = radius === RADIUS_STEPS[RADIUS_STEPS.length - 1];

  const handleResetToRadius = () => {
    setQueryMode("radius");
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: radius <= 5 ? 13.5 : radius <= 10 ? 12.5 : radius <= 20 ? 11.5 : 10,
        duration: 600,
      });
    }
  };

  // 全頁 loading screen 只在「首次完全沒資料」時顯示
  // 切 mode / radius / 拖地圖時 placeholderData 會保留上次 data，這條 condition 為 false
  // → MapView 不會被 unmount，縮放/中心不會被 reset
  if (isLoading && !data) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4"
        style={{ height: "100dvh", background: "var(--background)" }}
      >
        <div
          className="flex flex-col items-center gap-3 px-5 py-4"
          style={{
            background: "var(--panel-glass)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            backdropFilter: "blur(18px)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <div className="flex items-center gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-sm animate-bounce"
                style={{
                  background: "var(--accent)",
                  animationDelay: `${delay}ms`,
                  boxShadow: "0 0 6px rgb(var(--accent-rgb) / 0.6)",
                }}
              />
            ))}
          </div>
          <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--muted)" }}>
            {t("locating")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col relative" style={{ height: "100dvh" }}>
      {/* 吉祥物 onboarding（只有第一次開啟才出現） */}
      <OnboardingOverlay />

      {/* 左上角：篩選器 + 半徑切換器，並排放在 viewMode 切換不受影響的位置 */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {/* 篩選器 trigger */}
        <button
          onClick={() => setShowFilter(true)}
          aria-label={tFilter("title")}
          className="flex items-center gap-2 px-3 py-2 transition-all backdrop-blur-md"
          style={{
            background: filterActive ? "rgb(var(--accent-rgb) / 0.18)" : "var(--panel-glass)",
            border: `1px solid ${filterActive ? "rgb(var(--accent-rgb) / 0.6)" : "var(--line)"}`,
            color: filterActive ? "var(--accent)" : "var(--muted)",
            borderRadius: 2,
            boxShadow: filterActive ? "0 0 12px rgb(var(--accent-rgb) / 0.18)" : "var(--shadow-glow)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            fontWeight: 700,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {/* acid 風格篩選 icon — 三條長度遞減的 1px 直線（wireframe 漏斗） */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="square"
            aria-hidden="true"
          >
            <line x1="2" y1="4" x2="14" y2="4" />
            <line x1="4" y1="8" x2="12" y2="8" />
            <line x1="6" y1="12" x2="10" y2="12" />
          </svg>
          <span>filter</span>
          {filterActive && (
            <span
              style={{
                minWidth: 18,
                padding: "0 4px",
                background: "rgb(var(--accent-rgb) / 0.3)",
                border: "1px solid rgb(var(--accent-rgb) / 0.6)",
                borderRadius: 2,
                fontSize: 9,
                lineHeight: "14px",
                textAlign: "center",
              }}
            >
              {filterCount}
            </span>
          )}
        </button>

        {/* 半徑切換器（5 / 10 / 20 / 50 km） */}
        <RadiusToggle mapRef={mapRef} userLocation={userLocation} />
      </div>

      {/* 右上角收合 cluster：globe button + popover（含語言/主題/登入） */}
      <TopRightCluster />

      {/* 兩個 view 常駐 DOM（地圖不因切換而重載），用 motion 控制顯隱 */}
      <div className="flex-1 min-h-0 relative">
        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: viewMode === "map" ? 1 : 0,
            scale: viewMode === "map" ? 1 : 0.97,
          }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          style={{ pointerEvents: viewMode === "map" ? "auto" : "none" }}
        >
          <MapView
            spots={spots}
            userLocation={userLocation}
            mapRef={mapRef}
            onExpandRadius={isMaxRadius ? undefined : handleExpandRadius}
            onResetToRadius={handleResetToRadius}
            isError={isError}
            onRetry={handleRetry}
          />
        </motion.div>

        <motion.div
          className="absolute inset-0"
          animate={{
            opacity: viewMode === "swipe" ? 1 : 0,
            y: viewMode === "swipe" ? 0 : 18,
          }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          style={{ pointerEvents: viewMode === "swipe" ? "auto" : "none" }}
        >
          <SwipeView
            spots={spots}
            userLocation={userLocation}
            isError={isError}
            onRetry={handleRetry}
          />
        </motion.div>
      </div>

      <BottomTabBar viewMode={viewMode} onChange={setViewMode} />

      {/* 篩選器 sheet — 跟 SwipeView 內部那個共用同份 useMapStore state */}
      <FilterSheet isOpen={showFilter} onClose={() => setShowFilter(false)} />
    </div>
  );
}
