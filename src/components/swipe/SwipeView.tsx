"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SwipeCard, type SwipeCardHandle } from "./SwipeCard";
import { SwipeActionBar } from "./SwipeActionBar";
import { FilterSheet } from "./FilterSheet";
import { TripPlanSheet } from "./TripPlanSheet";
import { useSwipeStore } from "@/store/useSwipeStore";
import { useSavedStore } from "@/store/useSavedStore";
import type { SpotMapPoint } from "@/types/spots";

const TOAST_DURATION = 2500;

interface SwipeViewProps {
  spots: SpotMapPoint[];
  userLocation?: { lat: number; lng: number } | null;
  isError?: boolean;
  onRetry?: () => void;
}

export function SwipeView({ spots, userLocation = null, isError, onRetry }: SwipeViewProps) {
  const t = useTranslations("swipe");
  const cardRef = useRef<SwipeCardHandle>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  const [tripFlash, setTripFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { addSkipped, addToTrip, tripSpotIds, skippedIds } = useSwipeStore();
  const { addSave } = useSavedStore();

  const visibleSpots = useMemo(
    () => spots.filter((s) => !skippedIds.includes(s.id)),
    [spots, skippedIds]
  );
  const currentSpot = visibleSpots[currentIndex] ?? null;
  const nextSpot = visibleSpots[currentIndex + 1] ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  const handleSkip = useCallback(() => {
    if (!currentSpot) return;
    addSkipped(currentSpot.id);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, addSkipped]);

  const handleSave = useCallback(() => {
    if (!currentSpot) return;
    addSave(currentSpot.id);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, addSave]);

  const handleAddToTrip = useCallback(() => {
    if (!currentSpot) return;
    const ok = addToTrip(currentSpot.id);
    if (!ok) {
      showToast(t("tripLimitReached"));
      return;
    }
    addSave(currentSpot.id);
    setTripFlash(true);
    setTimeout(() => setTripFlash(false), 500);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, addToTrip, addSave, showToast, t]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showFilter || showTrip) return;
      if (e.key === "ArrowLeft") cardRef.current?.flyOut("left");
      if (e.key === "ArrowRight") cardRef.current?.flyOut("right");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showFilter, showTrip]);

  const allDone = currentIndex >= visibleSpots.length;

  return (
    <div
      className="flex flex-col h-full pt-4 pb-24"
      style={{ background: "var(--background)" }}
    >
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between px-5 mb-4 shrink-0">
        {/* 篩選按鈕 */}
        <button
          onClick={() => setShowFilter(true)}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "var(--muted)", cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
            <line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          {t("filter")}
        </button>

        {/* 行程計數 */}
        <button
          onClick={() => setShowTrip(true)}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{ cursor: "pointer" }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i < tripSpotIds.length ? "var(--accent)" : "var(--panel-light)",
                boxShadow: i < tripSpotIds.length ? "0 0 6px rgb(var(--accent-rgb) / 0.5)" : "none",
              }}
            />
          ))}
          <span
            className="text-xs ml-1 tracking-wider"
            style={{ color: tripSpotIds.length > 0 ? "var(--accent)" : "var(--muted)" }}
          >
            {t("tripProgress", { count: tripSpotIds.length })}
          </span>
          {tripSpotIds.length > 0 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" style={{ color: "var(--accent)" }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          )}
        </button>
      </div>

      {/* 卡片區 */}
      <div className="flex-1 flex items-center justify-center px-5 min-h-0">
        {isError ? (
          <div className="text-center">
            <p className="text-base font-content" style={{ color: "var(--muted)" }}>
              無法載入景點
            </p>
            <p className="text-sm mt-1 font-content" style={{ color: "var(--muted)", opacity: 0.6 }}>
              請檢查網路連線後重試
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  borderRadius: "2px",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  cursor: "pointer",
                }}
              >
                重試
              </button>
            )}
          </div>
        ) : allDone ? (
          <div className="text-center">
            <p className="text-base font-content" style={{ color: "var(--muted)" }}>
              {t("allDoneTitle")}
            </p>
            <p className="text-sm mt-1 font-content" style={{ color: "var(--muted)", opacity: 0.6 }}>
              {t("allDoneHint")}
            </p>
            {tripSpotIds.length > 0 && (
              <button
                onClick={() => setShowTrip(true)}
                className="mt-4 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  borderRadius: "2px",
                  background: "var(--foreground)",
                  color: "var(--background)",
                  cursor: "pointer",
                }}
              >
                {t("viewTripCta", { count: tripSpotIds.length })}
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full max-w-sm" style={{ height: "min(520px, 70vh)" }}>
            {nextSpot && (
              <SwipeCard
                key={`bg-${nextSpot.id}`}
                spot={nextSpot}
                onSwipeLeft={() => {}}
                onSwipeRight={() => {}}
                isTop={false}
              />
            )}
            {currentSpot && (
              <SwipeCard
                key={currentSpot.id}
                ref={cardRef}
                spot={currentSpot}
                onSwipeLeft={handleSkip}
                onSwipeRight={handleSave}
                isTop={true}
              />
            )}
          </div>
        )}
      </div>

      {/* 桌機方向按鈕（只在大螢幕顯示） */}
      {!allDone && !isError && (
        <div className="hidden md:flex items-center justify-center gap-2 mb-4 shrink-0">
          <button
            onClick={() => cardRef.current?.flyOut("left")}
            className="w-9 h-9 flex items-center justify-center text-sm transition-colors"
            style={{
              borderRadius: "2px",
              background: "var(--panel-light)",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            aria-label={t("leftArrow")}
          >
            ←
          </button>
          <button
            onClick={() => cardRef.current?.flyOut("right")}
            className="w-9 h-9 flex items-center justify-center text-sm transition-colors"
            style={{
              borderRadius: "2px",
              background: "var(--panel-light)",
              border: "1px solid var(--line)",
              color: "var(--muted)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            aria-label={t("rightArrow")}
          >
            →
          </button>
        </div>
      )}

      {/* 按鈕列 */}
      {!allDone && !isError && (
        <div className="shrink-0 px-5 pb-2">
          <SwipeActionBar
            onSkip={() => cardRef.current?.flyOut("left")}
            onAddToTrip={handleAddToTrip}
            onSave={() => cardRef.current?.flyOut("right")}
            tripCount={tripSpotIds.length}
            showTripFlash={tripFlash}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div
            className="px-5 py-3 text-sm text-center font-content"
            style={{
              borderRadius: "8px",
              background: "var(--panel-glass-strong)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--line)",
              color: "var(--foreground)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            {toast}
          </div>
        </div>
      )}

      <FilterSheet isOpen={showFilter} onClose={() => setShowFilter(false)} />
      <TripPlanSheet
        isOpen={showTrip}
        onClose={() => setShowTrip(false)}
        spots={spots}
        userLocation={userLocation}
      />
    </div>
  );
}
