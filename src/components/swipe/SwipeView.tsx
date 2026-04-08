"use client";

import { useRef, useState, useEffect, useCallback } from "react";
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
}

export function SwipeView({ spots, userLocation = null }: SwipeViewProps) {
  const cardRef = useRef<SwipeCardHandle>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  const [tripFlash, setTripFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { addSkipped, addToTrip, tripSpotIds } = useSwipeStore();
  const { addSave } = useSavedStore();

  const visibleSpots = spots.filter((s) => !useSwipeStore.getState().skippedIds.includes(s.id));
  const currentSpot = visibleSpots[currentIndex] ?? null;
  const nextSpot = visibleSpots[currentIndex + 1] ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  // 左滑 / X = 跳過，立即換下一張
  const handleSkip = useCallback(() => {
    if (!currentSpot) return;
    addSkipped(currentSpot.id);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, addSkipped]);

  // 右滑 / ✓ = 收藏，立即換下一張（不延遲，避免 x 值被 re-render 重置）
  const handleSave = useCallback(() => {
    if (!currentSpot) return;
    addSave(currentSpot.id);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, addSave]);

  // + = 加入行程 + 自動收藏，立即換下一張
  const handleAddToTrip = useCallback(() => {
    if (!currentSpot) return;
    const ok = addToTrip(currentSpot.id);
    if (!ok) {
      showToast("今日行程已達上限（5 個地點）");
      return;
    }
    addSave(currentSpot.id);
    setTripFlash(true);
    setTimeout(() => setTripFlash(false), 500);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, addToTrip, addSave, showToast]);

  // 桌機鍵盤操作
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
    <div className="flex flex-col h-full bg-zinc-950 pt-4 pb-24">
      {/* 頂部列 */}
      <div className="flex items-center justify-between px-5 mb-4 shrink-0">
        <button
          onClick={() => setShowFilter(true)}
          className="flex items-center gap-1.5 text-zinc-400 text-sm hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          篩選
        </button>

        {/* 行程計數 — 可點擊開啟行程規劃 */}
        <button
          onClick={() => setShowTrip(true)}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < tripSpotIds.length ? "bg-blue-400" : "bg-zinc-700"
              }`}
            />
          ))}
          <span className={`text-xs ml-1 transition-colors ${tripSpotIds.length > 0 ? "text-blue-400" : "text-zinc-500"}`}>
            {tripSpotIds.length}/5 行程
          </span>
          {tripSpotIds.length > 0 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-400">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>

      {/* 卡片區 */}
      <div className="flex-1 flex items-center justify-center px-5 min-h-0">
        {allDone ? (
          <div className="text-center">
            <p className="text-zinc-400 text-base">附近景點已全部看完</p>
            <p className="text-zinc-600 text-sm mt-1">試試擴大搜尋範圍或重設篩選</p>
            {tripSpotIds.length > 0 && (
              <button
                onClick={() => setShowTrip(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-white text-zinc-900 text-sm font-semibold"
              >
                查看今日行程 ({tripSpotIds.length} 個地點)
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

      {/* 桌機方向按鈕 */}
      {!allDone && (
        <div className="hidden md:flex items-center justify-center gap-2 mb-4 shrink-0">
          <button
            onClick={() => cardRef.current?.flyOut("left")}
            className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            aria-label="向左滑"
          >
            ←
          </button>
          <button
            onClick={() => cardRef.current?.flyOut("right")}
            className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition-colors"
            aria-label="向右滑"
          >
            →
          </button>
        </div>
      )}

      {/* 按鈕列 */}
      {!allDone && (
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
          <div className="bg-zinc-800/95 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-3 text-white text-sm text-center shadow-xl">
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
