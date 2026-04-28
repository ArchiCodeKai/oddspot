"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SwipeCard, type SwipeCardHandle } from "./SwipeCard";
import { SwipeActionBar } from "./SwipeActionBar";
import { FilterSheet } from "./FilterSheet";
import { TripPlanSheet } from "./TripPlanSheet";
import { useSwipeStore } from "@/store/useSwipeStore";
import { useSavedStore } from "@/store/useSavedStore";
import { ROUTES } from "@/lib/constants/routes";
import type { SpotMapPoint } from "@/types/spots";

const TOAST_DURATION = 2500;
const HINT_DURATION = 2800;
const HINT_STORAGE_KEY = "oddspot-swipe-hint-seen";

interface SwipeViewProps {
  spots: SpotMapPoint[];
  userLocation?: { lat: number; lng: number } | null;
  isError?: boolean;
  onRetry?: () => void;
}

export function SwipeView({ spots, userLocation = null, isError, onRetry }: SwipeViewProps) {
  const t = useTranslations("swipe");
  const router = useRouter();
  const cardRef = useRef<SwipeCardHandle>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [showTrip, setShowTrip] = useState(false);
  const [tripFlash, setTripFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 首次手勢提示（sessionStorage 控制，每個 session 只看一次）
  const [showHint, setShowHint] = useState(false);

  const { addSkipped, addToTrip, undoSkip, tripSpotIds, skippedIds, lastSkippedId } = useSwipeStore();
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

  // 首次進入卡片頁時顯示手勢提示，2.8 秒後自動淡出
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isError || !currentSpot) return;
    const seen = sessionStorage.getItem(HINT_STORAGE_KEY) === "1";
    if (seen) return;
    setShowHint(true);
    const t1 = setTimeout(() => {
      setShowHint(false);
      sessionStorage.setItem(HINT_STORAGE_KEY, "1");
    }, HINT_DURATION);
    return () => clearTimeout(t1);
    // 只在第一次有 currentSpot 時觸發；後續 currentSpot 變化不再 retrigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSwipeUp = useCallback(() => {
    if (!currentSpot) return;
    router.push(ROUTES.SPOT_DETAIL(currentSpot.id));
  }, [currentSpot, router]);

  const handleUndo = useCallback(() => {
    const restoredId = undoSkip();
    if (!restoredId) return;
    // 把 currentIndex 倒一格，讓被救回來的卡片立刻出現
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, [undoSkip]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showFilter || showTrip) return;
      if (e.key === "ArrowLeft") cardRef.current?.flyOut("left");
      if (e.key === "ArrowRight") cardRef.current?.flyOut("right");
      if (e.key === "ArrowUp") handleSwipeUp();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showFilter, showTrip, handleSwipeUp]);

  const allDone = currentIndex >= visibleSpots.length;
  const canUndo = lastSkippedId !== null;

  return (
    <div
      className="relative flex flex-col h-full pt-4 pb-24"
      style={{ background: "var(--background)" }}
    >
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between px-5 mb-4 shrink-0">
        {/* 篩選 + Undo */}
        <div className="flex items-center gap-3">
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

          {/* Undo 按鈕（只在有東西可救時顯示） */}
          <AnimatePresence>
            {canUndo && (
              <motion.button
                key="undo"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                onClick={handleUndo}
                aria-label={t("undoLabel")}
                title={t("undoLabel")}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  letterSpacing: "0.12em",
                  textShadow: "0 0 8px rgb(var(--accent-rgb) / 0.4)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 14 4 9 9 4" />
                  <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                </svg>
                <span className="uppercase">{t("undo")}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 行程計數 */}
        <button
          onClick={() => setShowTrip(true)}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{ cursor: "pointer" }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 transition-all"
              style={{
                background: i < tripSpotIds.length ? "var(--accent)" : "var(--panel-light)",
                border: i < tripSpotIds.length ? "none" : "1px solid var(--line)",
                boxShadow: i < tripSpotIds.length ? "0 0 6px rgb(var(--accent-rgb) / 0.5)" : "none",
                borderRadius: "50%",
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
      <div className="flex-1 flex items-center justify-center px-5 min-h-0 relative">
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
                onSwipeUp={handleSwipeUp}
                isTop={true}
              />
            )}

            {/* 首次手勢提示 overlay */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  key="gesture-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "rgb(var(--background-rgb) / 0.5)",
                      backdropFilter: "blur(2px)",
                    }}
                  />
                  <div
                    className="relative grid grid-rows-[auto_1fr_auto] grid-cols-3 gap-3 w-full h-full p-6 items-center"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      letterSpacing: "0.18em",
                      color: "var(--accent)",
                    }}
                  >
                    {/* 上：detail */}
                    <div className="col-span-3 flex flex-col items-center gap-2">
                      <HintArrow direction="up" />
                      <span className="text-[11px] uppercase">{t("gestureDetail")}</span>
                    </div>
                    {/* 中：左右 */}
                    <div className="flex flex-col items-center gap-2">
                      <HintArrow direction="left" />
                      <span className="text-[11px] uppercase">{t("gestureSkip")}</span>
                    </div>
                    <div /> {/* spacer */}
                    <div className="flex flex-col items-center gap-2">
                      <HintArrow direction="right" />
                      <span className="text-[11px] uppercase">{t("gestureSave")}</span>
                    </div>
                    {/* 下：留空 */}
                    <div className="col-span-3" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              borderRadius: "2px",
              background: "var(--panel-glass-strong)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--line-strong)",
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

// 手勢提示用的箭頭符號（Acid 風格：1.6 stroke、square cap）
function HintArrow({ direction }: { direction: "up" | "down" | "left" | "right" }) {
  const rotation = {
    up: 0,
    right: 90,
    down: 180,
    left: 270,
  }[direction];

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      style={{
        transform: `rotate(${rotation}deg)`,
        filter: "drop-shadow(0 0 8px rgb(var(--accent-rgb) / 0.6))",
      }}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="6 11 12 5 18 11" />
    </svg>
  );
}
