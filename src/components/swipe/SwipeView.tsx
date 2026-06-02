"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { SwipeCard, type SwipeCardHandle } from "./SwipeCard";
import { SwipeActionBar } from "./SwipeActionBar";
import { TripPlanSheet } from "./TripPlanSheet";
import { useSwipeStore } from "@/store/useSwipeStore";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";
import { useSavedStore } from "@/store/useSavedStore";
import type { SpotMapPoint } from "@/types/spots";

const TOAST_DURATION = 2500;
const HINT_DURATION = 2800;
const HINT_STORAGE_KEY = "oddspot-swipe-hint-seen";

interface SwipeViewProps {
  spots: SpotMapPoint[];
  isError?: boolean;
  onRetry?: () => void;
  onOpenRoutePlanner?: () => void;
}

export function SwipeView({
  spots,
  isError,
  onRetry,
  onOpenRoutePlanner,
}: SwipeViewProps) {
  const t = useTranslations("swipe");
  const cardRef = useRef<SwipeCardHandle>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTrip, setShowTrip] = useState(false);
  const [tripFlash, setTripFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // 首次手勢提示（sessionStorage 控制，每個 session 只看一次）
  const [showHint, setShowHint] = useState(false);

  const { addSkipped, undoSkip, skippedIds, lastSkippedId } = useSwipeStore();
  const selectedSpots = useRoutePlannerStore((s) => s.selectedSpots);
  const addRouteSpot = useRoutePlannerStore((s) => s.addSpot);
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

  const handleSaveOnly = useCallback(() => {
    if (!currentSpot) return;
    addSave(currentSpot.id);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, addSave]);

  const handleSaveAndAddToTrip = useCallback(() => {
    if (!currentSpot) return;
    const alreadySelected = selectedSpots.some((spot) => spot.id === currentSpot.id);
    if (!alreadySelected && selectedSpots.length >= 5) {
      showToast(t("tripLimitReached"));
      return;
    }
    addRouteSpot(currentSpot);
    addSave(currentSpot.id);
    setTripFlash(true);
    setTimeout(() => setTripFlash(false), 500);
    setCurrentIndex((i) => i + 1);
  }, [currentSpot, selectedSpots, addRouteSpot, addSave, showToast, t]);

  const handleUndo = useCallback(() => {
    const restoredId = undoSkip();
    if (!restoredId) return;
    // 把 currentIndex 倒一格，讓被救回來的卡片立刻出現
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, [undoSkip]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (showTrip) return;
      if (e.key === "ArrowLeft") cardRef.current?.flyOut("left");
      if (e.key === "ArrowRight") cardRef.current?.flyOut("right");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showTrip]);

  const allDone = currentIndex >= visibleSpots.length;
  const canUndo = lastSkippedId !== null;

  return (
    <div
      className="swipe-view-shell relative flex flex-col h-full pt-4 pb-28"
      style={{ background: "var(--background)" }}
    >
      <style>{`
        .swipe-view-shell {
          overflow: hidden;
        }
        .swipe-toolbar {
          display: grid;
          grid-template-columns: auto auto;
          align-items: center;
          justify-content: center;
          gap: 18px;
          width: min(100%, 30rem);
          margin-inline: auto;
          padding: 0;
          position: relative;
          z-index: 24;
          transform: translateX(-24px);
        }
        .swipe-toolbar-actions {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          transform: translateX(-88px);
        }
        .swipe-undo-button {
          position: relative;
          width: 37px;
          height: 37px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--line-strong);
          background: var(--panel-glass-strong);
          box-shadow:
            0 14px 30px rgb(var(--background-rgb) / 0.5),
            inset 0 1px 0 rgb(var(--accent-rgb) / 0.16);
          backdrop-filter: blur(14px);
          transition:
            color 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease,
            transform 0.14s ease;
        }
        .swipe-undo-button:hover,
        .swipe-undo-button:focus-visible {
          color: var(--accent) !important;
          border-color: rgb(var(--accent-rgb) / 0.56);
          box-shadow:
            0 14px 30px rgb(var(--background-rgb) / 0.52),
            inset 0 1px 0 rgb(var(--accent-rgb) / 0.24);
        }
        .swipe-undo-button:active {
          transform: translateY(2px);
        }
        .swipe-undo-tooltip {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: calc(100% + 9px);
          padding: 4px 8px;
          border: 1px solid var(--line);
          border-radius: 2px;
          background: var(--panel-glass-strong);
          color: var(--foreground);
          font-family: var(--font-jetbrains-mono), monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.16s ease, transform 0.16s ease;
        }
        .swipe-undo-button:hover .swipe-undo-tooltip,
        .swipe-undo-button:focus-visible .swipe-undo-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(-2px);
        }
        .swipe-card-frame {
          width: min(100%, calc(100vw - 32px));
          max-width: 24rem;
          height: min(520px, 70vh);
        }
        @media (max-width: 767px) {
          .swipe-view-shell {
            padding-top: max(76px, calc(env(safe-area-inset-top) + 68px));
            padding-bottom: max(88px, calc(env(safe-area-inset-bottom) + 82px));
          }
          .swipe-toolbar {
            grid-template-columns: auto minmax(0, 1fr);
            gap: 8px;
            width: auto;
            padding-inline: 16px;
            margin-top: 12px;
            margin-bottom: 14px;
            transform: none;
          }
          .swipe-undo-button {
            width: 46px;
            height: 46px;
          }
          .swipe-toolbar-actions {
            transform: none;
          }
          .swipe-toolbar .trip-slots-button {
            justify-content: flex-end;
            max-width: 100%;
            min-width: 0;
          }
          .swipe-toolbar .trip-count-label {
            font-size: 11px;
            letter-spacing: 0.08em !important;
            white-space: nowrap;
          }
        }
        @media (min-width: 768px) {
          .swipe-card-frame {
            width: min(100%, 24rem);
          }
        }
        @media (min-width: 768px) and (max-width: 1279px) {
          .swipe-view-shell {
            padding-top: 42px;
          }
          .swipe-toolbar {
            width: min(calc(100vw - 180px), 36rem);
            margin-top: 58px;
            margin-bottom: 30px;
            transform: none;
          }
          .swipe-card-frame {
            width: clamp(34rem, 72vw, 48rem);
            max-width: calc(100vw - 72px);
            height: min(820px, 74vh);
            margin-top: 0;
          }
          .swipe-undo-button {
            width: 48px;
            height: 48px;
          }
          .swipe-toolbar-actions {
            transform: none;
          }
          .swipe-toolbar .trip-slots-button {
            gap: 6px;
          }
          .swipe-toolbar .trip-count-label {
            white-space: nowrap;
          }
        }
      `}</style>
      {/* 頂部工具列 */}
      <div className="swipe-toolbar mb-4 shrink-0">
        <div className="swipe-toolbar-actions">
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
                className="swipe-undo-button"
                style={{
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                <span className="swipe-undo-tooltip">{t("undo")}</span>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 14 4 9 9 4" />
                  <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 行程計數 */}
        <TripMascotSlots
          count={selectedSpots.length}
          label={t("tripProgress", { count: selectedSpots.length })}
          onClick={() => setShowTrip(true)}
        />
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
            {selectedSpots.length > 0 && (
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
                {t("viewTripCta", { count: selectedSpots.length })}
              </button>
            )}
          </div>
        ) : (
          <div
            className="swipe-card-frame relative"
            style={{
              marginBottom: "clamp(46px, 7vh, 72px)",
            }}
          >
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
                onSwipeRight={handleSaveAndAddToTrip}
                onCollectToTrip={handleSaveOnly}
                tripCount={selectedSpots.length}
                showTripFlash={tripFlash}
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
                    {/* 上：更多資料提示 */}
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
            <div
              className="absolute left-0 right-0 hidden md:flex justify-center"
              style={{
                bottom: "clamp(-54px, -6vh, -38px)",
                zIndex: 32,
                pointerEvents: "none",
              }}
            >
              <div style={{ pointerEvents: "auto" }}>
                <SwipeActionBar
                  onSkip={() => cardRef.current?.flyOut("left")}
                  onSave={() => cardRef.current?.collectToTrip() ?? handleSaveOnly()}
                  onSaveAndAddToTrip={() => cardRef.current?.flyOut("right")}
                  tripCount={selectedSpots.length}
                  showTripFlash={tripFlash}
                />
              </div>
            </div>
          </div>
        )}
      </div>

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

      <TripPlanSheet
        isOpen={showTrip}
        onClose={() => setShowTrip(false)}
        onOpenRoutePlanner={onOpenRoutePlanner}
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

function TripMascotSlots({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <>
      <style>{`
        @keyframes trip-mascot-idle-hop {
          0%, 72%, 100% { transform: translateY(0); }
          76% { transform: translateY(1px); }
          82% { transform: translateY(-3px); }
          88% { transform: translateY(0); }
          92% { transform: translateY(-1px); }
        }
        @keyframes trip-mascot-idle-look {
          0%, 54%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.92; }
          60% { transform: translate3d(-1.4px, -0.5px, 0) scale(0.94); opacity: 1; }
          70% { transform: translate3d(1.3px, 0.35px, 0) scale(1.04); opacity: 1; }
          80% { transform: translate3d(0.2px, 0, 0) scale(1); opacity: 0.94; }
        }
        @keyframes trip-mascot-idle-turn {
          0%, 68%, 100% { transform: translateX(0) skewX(0deg); }
          75% { transform: translateX(-0.8px) skewX(-2deg); }
          84% { transform: translateX(0.7px) skewX(1.6deg); }
        }
        @keyframes trip-mascot-squash {
          0%, 72%, 100% { transform: scale3d(1, 1, 1); }
          76% { transform: scale3d(1.1, 0.88, 1); }
          82% { transform: scale3d(0.9, 1.12, 1); }
          88% { transform: scale3d(1.08, 0.92, 1); }
          94% { transform: scale3d(0.98, 1.04, 1); }
        }
        .trip-slot {
          position: relative;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }
        .trip-slot.is-filled {
          opacity: 1 !important;
        }
        .trip-slot.is-empty {
          opacity: 0.28;
          filter: grayscale(1);
        }
        .trip-mascot-motion {
          transform-origin: 50% 72%;
          will-change: transform;
        }
        .trip-slot.is-filled:nth-of-type(3n + 1) .trip-mascot-motion {
          animation: trip-mascot-idle-hop 4.8s ease-in-out infinite;
        }
        .trip-slot.is-filled:nth-of-type(3n + 1) .trip-mini-body {
          animation: trip-mascot-squash 4.8s ease-in-out infinite;
        }
        .trip-slot.is-filled:nth-of-type(3n + 2) .trip-mini-pupil {
          animation: trip-mascot-idle-look 5.4s ease-in-out infinite;
        }
        .trip-slot.is-filled:nth-of-type(3n) .trip-mini-eye-group {
          animation: trip-mascot-idle-turn 6s ease-in-out infinite;
        }
        .trip-mini-body,
        .trip-mini-eye-group,
        .trip-mini-pupil {
          transform-box: fill-box;
          transform-origin: center;
          will-change: transform;
        }
        .trip-slots-button:hover .trip-slot.is-filled,
        .trip-slots-button:focus-visible .trip-slot.is-filled {
          transform: translateY(-1px);
        }
        .trip-slots-button:hover .trip-slot.is-empty,
        .trip-slots-button:focus-visible .trip-slot.is-empty {
          opacity: 0.42;
        }
        .trip-slots-button:hover .trip-mini-pupil,
        .trip-slots-button:focus-visible .trip-mini-pupil {
          transform: translate3d(1.4px, -0.4px, 0) scale(1.03);
        }
        .trip-slots-button:hover .trip-count-label,
        .trip-slots-button:focus-visible .trip-count-label {
          color: var(--accent) !important;
          border-bottom-color: rgb(var(--accent-rgb) / 0.7) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .trip-slot.is-filled .trip-mascot-motion,
          .trip-slot.is-filled .trip-mini-body,
          .trip-slot.is-filled .trip-mini-eye-group,
          .trip-slot.is-filled .trip-mini-pupil {
            animation: none !important;
          }
        }
      `}</style>
      <button
        onClick={onClick}
        title={label}
        aria-label={label}
        className="trip-slots-button flex items-center gap-1.5"
        style={{
          cursor: "pointer",
          minHeight: 36,
          padding: "4px 6px",
          borderRadius: 2,
          border: "1px solid transparent",
          background: "transparent",
          transition: "filter 0.18s ease",
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const filled = i < count;
          return (
            <span
              key={i}
              className={`trip-slot ${filled ? "is-filled" : "is-empty"}`}
              style={{
                width: 18,
                height: 20,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="trip-mascot-motion"
                style={{ animationDelay: `${i * 0.42}s` }}
              >
                <TripMiniMascot filled={filled} />
              </span>
            </span>
          );
        })}
        <span
          className="trip-count-label text-xs ml-1 tracking-wider"
          style={{
            color: count > 0 ? "var(--accent)" : "var(--muted)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            letterSpacing: "0.12em",
            borderBottom: "1px solid transparent",
            transition: "color 0.18s ease, border-color 0.18s ease",
          }}
        >
          {label}
        </span>
      </button>
    </>
  );
}

function TripMiniMascot({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="20"
      viewBox="0 0 120 130"
      fill="none"
      aria-hidden="true"
      className="block"
    >
      <g className="trip-mini-body">
        <path
          d="M55 8 C70 4,90 18,92 40 C94 56,90 72,82 86 C78 94,76 104,78 112 C79 117,82 120,84 116 C86 112,84 106,80 102 C74 98,60 110,48 116 C38 122,24 118,18 106 C12 94,14 76,18 62 C22 48,30 18,55 8Z"
          stroke={filled ? "var(--foreground)" : "var(--muted)"}
          strokeOpacity={filled ? 0.92 : 0.42}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g className="trip-mini-eye-group">
        <path
          d="M34 52 C33 44,45 36,58 36 C69 36,77 41,75 48 C73 56,61 62,49 62 C39 62,34 58,34 52Z"
          stroke={filled ? "var(--foreground)" : "var(--muted)"}
          strokeOpacity={filled ? 0.9 : 0.42}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g className="trip-mini-pupil">
          <ellipse
            cx="56"
            cy="49"
            rx="7"
            ry="9"
            fill={filled ? "var(--accent)" : "var(--muted)"}
            fillOpacity={filled ? 0.96 : 0.45}
          />
          <circle
            cx="55"
            cy="47"
            r="2"
            fill="var(--background)"
            fillOpacity={filled ? 0.88 : 0.55}
          />
        </g>
        <ellipse
          className="trip-mini-highlight"
          cx="61"
          cy="40"
          rx="1.6"
          ry="1.2"
          fill={filled ? "var(--accent)" : "var(--muted)"}
          fillOpacity={filled ? 0.74 : 0.28}
        />
      </g>
    </svg>
  );
}
