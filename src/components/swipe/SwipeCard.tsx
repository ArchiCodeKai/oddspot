"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useTranslations } from "next-intl";
import { SwipeActionBar } from "./SwipeActionBar";
import { CATEGORY_CODES, type SpotCategory } from "@/lib/constants/categories";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SpotStatus } from "@/lib/constants/status";
import { getCategoryLabel } from "@/lib/i18n/spotMeta";
import type { SpotMapPoint } from "@/types/spots";

const SWIPE_THRESHOLD = 100;
const CARD_RADIUS = 2; // v3：sharp corners 取代 rounded-3xl

type DifficultyKey = "easy" | "medium" | "hard";
type SwipeFeedback = "skip" | "save" | "trip" | null;

export interface SwipeCardHandle {
  flyOut: (direction: "left" | "right") => void;
  collectToTrip: () => void;
}

interface SwipeCardProps {
  spot: SpotMapPoint;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onCollectToTrip?: () => void;
  tripCount?: number;
  showTripFlash?: boolean;
  isTop: boolean;
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({
    spot,
    onSwipeLeft,
    onSwipeRight,
    onCollectToTrip,
    tripCount = 0,
    showTripFlash = false,
    isTop,
  }, ref) {
    const t = useTranslations("swipe");
    const tMeta = useTranslations("spotMeta");
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const scale = useMotionValue(1);
    const opacity = useMotionValue(1);
    const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
    const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
    const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    const leftEdgeX = useTransform(x, [-180, 0], [74, -28]);
    const rightEdgeX = useTransform(x, [0, 180], [28, -74]);
    const leftEdgeOpacity = useTransform(x, [-180, -24, 0], [0.08, 0.22, 0]);
    const rightEdgeOpacity = useTransform(x, [0, 24, 180], [0, 0.22, 0.08]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [feedback, setFeedback] = useState<SwipeFeedback>(null);
    const collectTargetX = 0;
    const collectTargetY = -8;

    const category = spot.category as SpotCategory;
    const Glyph = CATEGORY_GLYPHS[category];
    const categoryCode = CATEGORY_CODES[category];
    const categoryLabel = getCategoryLabel(tMeta, category);
    const didDrag = useRef(false);
    const images = useMemo(
      () => (spot.images && spot.images.length > 0 ? spot.images : spot.coverImage ? [spot.coverImage] : []).slice(0, 3),
      [spot.coverImage, spot.images]
    );
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`;

    const flyOut = (direction: "left" | "right") => {
      const target = direction === "left" ? -600 : 600;
      setFeedback(direction === "left" ? "skip" : "save");
      window.setTimeout(() => setFeedback(null), 700);
      animate(x, target, { duration: 0.34, ease: "easeOut" }).then(() => {
        if (direction === "left") onSwipeLeft();
        else onSwipeRight();
      });
    };

    const collectToTrip = () => {
      setFeedback("trip");
      animate(x, collectTargetX, { duration: 0.18, ease: "easeOut" });
      animate(y, collectTargetY, { duration: 0.18, ease: "easeOut" });
      animate(scale, 0.18, { duration: 0.5, ease: [0.2, 0.84, 0.2, 1] });
      animate(opacity, 0, { duration: 0.3, ease: "easeInOut", delay: 0.22 }).then(() => {
        onCollectToTrip?.();
        x.set(0);
        y.set(0);
        scale.set(1);
        opacity.set(1);
        setFeedback(null);
      });
    };

    useImperativeHandle(ref, () => ({ flyOut, collectToTrip }));

    if (!isTop) {
      return (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: CARD_RADIUS,
            transform: "scale(0.95) translateY(12px)",
            zIndex: 0,
            boxShadow: "var(--shadow-glow)",
          }}
        />
      );
    }

    return (
      <motion.div
        className={`absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing ${feedback === "trip" ? "swipe-card-intake" : ""}`}
        style={{
          x,
          y,
          scale,
          opacity,
          rotate,
          zIndex: 1,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: CARD_RADIUS,
          boxShadow: "0 16px 48px rgb(var(--background-rgb) / 0.5), 0 0 32px rgb(var(--accent-rgb) / 0.08)",
          touchAction: "pan-y",
        }}
        drag="x"
        dragMomentum={false}
        dragElastic={0.2}
        onDragStart={() => { didDrag.current = false; }}
        onDrag={() => { didDrag.current = true; }}
        onDragEnd={(_, info) => {
          const dx = info.offset.x;
          const dy = info.offset.y;
          const horizontalDominant = Math.abs(dx) > Math.abs(dy);

          if (horizontalDominant && dx > SWIPE_THRESHOLD) {
            flyOut("right");
          } else if (horizontalDominant && dx < -SWIPE_THRESHOLD) {
            flyOut("left");
          } else {
            animate(x, 0, { type: "spring", stiffness: 220, damping: 22 });
          }
        }}
      >
        <style>{`
          .acid-card-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgb(var(--accent-rgb) / 0.56) rgb(var(--foreground-rgb) / 0.06);
          }
          .acid-card-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .acid-card-scroll::-webkit-scrollbar-track {
            background: rgb(var(--foreground-rgb) / 0.04);
          }
          .acid-card-scroll::-webkit-scrollbar-thumb {
            background: rgb(var(--accent-rgb) / 0.42);
            border-radius: 999px;
          }
          .acid-card-scroll:hover::-webkit-scrollbar-thumb {
            background: rgb(var(--accent-rgb) / 0.72);
          }
          @keyframes swipe-card-stamp {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.78) rotate(-8deg); }
            18% { opacity: 1; transform: translate(-50%, -50%) scale(1.08) rotate(-2deg); }
            72% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.96) rotate(4deg); }
          }
          @keyframes swipe-card-folder-pulse {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.82); }
            24% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
            100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          .swipe-card-feedback {
            animation: swipe-card-stamp 0.7s ease both;
          }
          .swipe-card-trip-folder {
            animation: swipe-card-folder-pulse 0.42s ease both;
          }
          .swipe-edge-hint {
            display: flex;
          }
          .swipe-mobile-actions .swipe-action-button {
            width: 68px !important;
            height: 68px !important;
            background: rgb(var(--background-rgb) / 0.82) !important;
          }
          .swipe-mobile-actions .swipe-action-main {
            width: 82px !important;
            height: 82px !important;
          }
          .swipe-mobile-actions .swipe-action-tooltip {
            display: none;
          }
          @media (prefers-reduced-motion: reduce) {
            .swipe-card-feedback,
            .swipe-card-trip-folder {
              animation: none;
            }
          }
        `}</style>
        <motion.div
          className="swipe-edge-hint absolute left-0 top-1/2 z-10 h-24 w-24 -translate-y-1/2 items-center justify-center rounded-full pointer-events-none"
          style={{
            x: leftEdgeX,
            opacity: leftEdgeOpacity,
            background: "rgb(var(--background-rgb) / 0.72)",
            color: "var(--muted)",
          }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.div>
        <motion.div
          className="swipe-edge-hint absolute right-0 top-1/2 z-10 h-24 w-24 -translate-y-1/2 items-center justify-center rounded-full pointer-events-none"
          style={{
            x: rightEdgeX,
            opacity: rightEdgeOpacity,
            background: "rgb(var(--background-rgb) / 0.72)",
            color: "var(--accent)",
          }}
        >
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
        {/* SKIP 提示（左滑） */}
        <motion.div
          className="hidden md:block absolute left-5 top-14 z-10 rotate-[-15deg] px-3 py-1.5 pointer-events-none"
          style={{
            opacity: leftOpacity,
            border: "2px solid var(--muted)",
            borderRadius: 2,
          }}
        >
          <span
            className="text-xl font-black tracking-widest"
            style={{
              color: "var(--muted)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.2em",
            }}
          >
            {t("skip")}
          </span>
        </motion.div>

        {/* SAVE 提示（右滑） */}
        <motion.div
          className="hidden md:block absolute right-5 top-14 z-10 rotate-[15deg] px-3 py-1.5 pointer-events-none"
          style={{
            opacity: rightOpacity,
            border: "2px solid rgb(var(--accent-rgb) / 0.8)",
            borderRadius: 2,
          }}
        >
          <span
            className="text-xl font-black tracking-widest"
            style={{
              color: "var(--accent)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.2em",
              textShadow: "0 0 12px rgb(var(--accent-rgb) / 0.7)",
            }}
          >
            {t("save")}
          </span>
        </motion.div>

        {feedback && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            {feedback === "trip" ? (
              <div
                className="swipe-card-trip-folder"
                style={{
                  width: 92,
                  height: 70,
                  color: "var(--accent)",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <svg viewBox="0 0 96 76" fill="none" aria-hidden="true">
                  <path
                    d="M8 21h28l7 8h45v36H8V21Z"
                    fill="rgb(var(--background-rgb) / 0.72)"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  <path d="M8 31h80" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
                  <path d="M36 48h24M48 36v24" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </div>
            ) : (
              <div
                className="swipe-card-feedback"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 112,
                  height: 112,
                  border: "2px solid currentColor",
                  borderRadius: 2,
                  color: feedback === "save" ? "var(--accent)" : "var(--muted)",
                  background: "rgb(var(--background-rgb) / 0.34)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {feedback === "save" ? (
                  <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
              </div>
            )}
          </div>
        )}

        <div
          ref={scrollRef}
          className="acid-card-scroll h-full overflow-y-auto overscroll-contain"
          style={{ background: "var(--panel)" }}
        >
        {/* 封面圖（無圖時顯示中央 glyph 作為 v3 placeholder） */}
        <div className="h-[58%] min-h-[300px] w-full relative overflow-hidden" style={{ background: "var(--panel-light)" }}>
          {spot.coverImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${spot.coverImage})` }}
            />
          ) : (
            // 無圖：用 category glyph 作為視覺主體，符合 v3 monochrome 識別
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                color: "var(--accent)",
                opacity: 0.55,
                filter: "drop-shadow(0 0 20px rgb(var(--accent-rgb) / 0.4))",
              }}
            >
              <Glyph size={96} />
            </div>
          )}

          {/* CRT scanlines 疊在封面上 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgb(var(--accent-rgb) / 0.04) 3px, rgb(var(--accent-rgb) / 0.04) 4px)",
            }}
          />

          {/* 左上角代碼（v3 B-grade detail：CATEGORY_CODE · #ID） */}
          <div
            className="absolute top-2.5 left-2.5"
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 9,
              letterSpacing: "0.22em",
              color: "var(--accent)",
              opacity: 0.7,
            }}
          >
            {categoryCode} · #{String(spot.id).padStart(3, "0")}
          </div>

          {/* 底部漸層淡入內容區 */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgb(var(--panel-rgb)))",
            }}
          />
        </div>

        {/* 內容區 */}
        <div className="min-h-[48%] px-5 pt-4 pb-28" style={{ background: "var(--panel)" }}>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <CategoryBadge category={category} label={categoryLabel} />
            <StatusBadge status={spot.status as SpotStatus} />
            <span
              className="text-[10px] uppercase"
              style={{
                color: "var(--muted)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.12em",
              }}
            >
              {t(`difficulty.${spot.difficulty as DifficultyKey}`)}
            </span>
          </div>

          {/* 景點名稱 */}
          <h2 className="text-lg font-bold leading-snug font-content" style={{ color: "var(--foreground)" }}>
            {spot.name}
          </h2>
          {spot.nameEn && (
            <p
              className="text-[11px] mt-0.5"
              style={{
                color: "var(--muted)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.04em",
              }}
            >
              {spot.nameEn}
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2">
            <InfoCell label={t("visits")} value={String(spot.visitCount ?? 0)} />
            <InfoCell
              label={t("bestTime")}
              value={spot.recommendedTime ?? t("unknown")}
            />
            <InfoCell
              label={t("difficultyLabel")}
              value={t(`difficulty.${spot.difficulty as DifficultyKey}`)}
            />
            <InfoCell label="GPS" value={`${spot.lat.toFixed(3)}, ${spot.lng.toFixed(3)}`} />
          </div>

          {spot.address && (
            <div className="mt-4">
              <p
                className="text-[10px] uppercase mb-1"
                style={{
                  color: "var(--muted)",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  letterSpacing: "0.14em",
                }}
              >
                {t("address")}
              </p>
              <p className="text-sm leading-relaxed font-content" style={{ color: "var(--foreground)" }}>
                {spot.address}
              </p>
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-5">
              <p
                className="text-[10px] uppercase mb-2"
                style={{
                  color: "var(--muted)",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  letterSpacing: "0.14em",
                }}
              >
                {t("photos")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {images.slice(0, 3).map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="aspect-square bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${image})`,
                      border: "1px solid var(--line)",
                      borderRadius: 2,
                    }}
                    aria-label={t("photoAlt", { index: index + 1 })}
                  />
                ))}
              </div>
            </div>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold transition-colors"
            style={{
              color: "var(--background)",
              background: "var(--foreground)",
              border: "1px solid var(--foreground)",
              borderRadius: 2,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
            onClick={(e) => {
              if (didDrag.current) {
                e.preventDefault();
                didDrag.current = false;
              }
            }}
          >
            {t("navigateGoogle")}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
          <div
            className="swipe-mobile-actions md:hidden mt-10 pb-4"
            aria-label={t("mobileActions")}
          >
            <SwipeActionBar
              onSkip={() => flyOut("left")}
              onAddToTrip={collectToTrip}
              onSave={() => flyOut("right")}
              tripCount={tripCount}
              showTripFlash={showTripFlash}
            />
          </div>
        </div>
        </div>
      </motion.div>
    );
  }
);

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-3 py-2 min-w-0"
      style={{
        border: "1px solid var(--line)",
        borderRadius: 2,
        background: "rgb(var(--foreground-rgb) / 0.025)",
      }}
    >
      <p
        className="text-[9px] uppercase"
        style={{
          color: "var(--muted)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </p>
      <p className="mt-1 text-xs truncate font-content" style={{ color: "var(--foreground)" }}>
        {value}
      </p>
    </div>
  );
}
