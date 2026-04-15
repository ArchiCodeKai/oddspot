"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useSpots } from "@/hooks/useSpots";
import { MapView } from "@/components/map/MapView";
import { SwipeView } from "@/components/swipe/SwipeView";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { AuthButton } from "@/components/auth/AuthButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LangToggle } from "@/components/ui/LangToggle";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";

const RADIUS_STEPS = [5, 10, 20];

type ViewMode = "map" | "swipe";

export default function MapPage() {
  const t = useTranslations("map");
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(5);
  const [viewMode, setViewMode] = useState<ViewMode>("map");

  // 取得使用者定位（純 UI side effect，不屬於 server state）
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(null)
    );
  }, []);

  const { data, isLoading, isError } = useSpots({ userLocation, radius });
  const spots = data?.spots ?? [];

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["spots"] });
  }, [queryClient]);

  const handleExpandRadius = () => {
    const currentIndex = RADIUS_STEPS.indexOf(radius);
    if (currentIndex < RADIUS_STEPS.length - 1) {
      setRadius(RADIUS_STEPS[currentIndex + 1]);
    }
  };

  if (isLoading) {
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

  const isMaxRadius = radius === RADIUS_STEPS[RADIUS_STEPS.length - 1];

  return (
    <div className="w-full flex flex-col relative" style={{ height: "100dvh" }}>
      {/* 吉祥物 onboarding（只有第一次開啟才出現） */}
      <OnboardingOverlay />

      {/* 右上角控制列：語言 → 主題 → 登入 */}
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-2 py-2"
        style={{
          background: "var(--panel-glass)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          backdropFilter: "blur(18px)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        <LangToggle />
        <ThemeToggle />
        <AuthButton />
      </div>

      <div className="flex-1 min-h-0">
        {viewMode === "map" ? (
          <MapView
            spots={spots}
            userLocation={userLocation}
            radius={radius}
            onExpandRadius={isMaxRadius ? undefined : handleExpandRadius}
            isError={isError}
            onRetry={handleRetry}
          />
        ) : (
          <SwipeView
            spots={spots}
            userLocation={userLocation}
            isError={isError}
            onRetry={handleRetry}
          />
        )}
      </div>

      <BottomTabBar viewMode={viewMode} onChange={setViewMode} />
    </div>
  );
}
