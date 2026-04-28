"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/constants/routes";
import { CATEGORY_CODES, type SpotCategory } from "@/lib/constants/categories";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SpotStatus } from "@/lib/constants/status";
import { getCategoryLabel } from "@/lib/i18n/spotMeta";
import type { SpotMapPoint } from "@/types/spots";

const SWIPE_THRESHOLD = 100;
const SWIPE_UP_THRESHOLD = 80; // 上滑進詳情：較小的閾值，配合「viewDetail 是次要動作」
const CARD_RADIUS = 2; // v3：sharp corners 取代 rounded-3xl

type DifficultyKey = "easy" | "medium" | "hard";

export interface SwipeCardHandle {
  flyOut: (direction: "left" | "right") => void;
}

interface SwipeCardProps {
  spot: SpotMapPoint;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  // 上滑進詳情；optional，外部沒接時走預設 Link 行為
  onSwipeUp?: () => void;
  isTop: boolean;
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({ spot, onSwipeLeft, onSwipeRight, onSwipeUp, isTop }, ref) {
    const t = useTranslations("swipe");
    const tMeta = useTranslations("spotMeta");
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
    const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
    const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    // 上滑提示：y 越往上（負值）opacity 越高
    const upOpacity = useTransform(y, [-SWIPE_UP_THRESHOLD, 0], [1, 0]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const category = spot.category as SpotCategory;
    const Glyph = CATEGORY_GLYPHS[category];
    const categoryCode = CATEGORY_CODES[category];
    const categoryLabel = getCategoryLabel(tMeta, category);

    // 追蹤是否發生拖曳，用來抑制 drag end 後誤觸 Link navigation
    const didDrag = useRef(false);

    const flyOut = (direction: "left" | "right") => {
      const target = direction === "left" ? -600 : 600;
      animate(x, target, { duration: 0.3, ease: "easeOut" }).then(() => {
        if (direction === "left") onSwipeLeft();
        else onSwipeRight();
      });
    };

    useImperativeHandle(ref, () => ({ flyOut }));

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
        className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          x,
          y,
          rotate,
          zIndex: 1,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: CARD_RADIUS,
          boxShadow: "0 16px 48px rgb(var(--background-rgb) / 0.5), 0 0 32px rgb(var(--accent-rgb) / 0.08)",
          touchAction: "none",
        }}
        drag={onSwipeUp ? true : "x"}
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
          } else if (!horizontalDominant && dy < -SWIPE_UP_THRESHOLD && onSwipeUp) {
            // 上滑：不做 fly-out 動畫，讓頁面 transition 接手
            onSwipeUp();
            // spring back 以防 navigation 失敗時 card 還在原位
            animate(x, 0, { type: "spring", stiffness: 220, damping: 22 });
            animate(y, 0, { type: "spring", stiffness: 220, damping: 22 });
          } else {
            animate(x, 0, { type: "spring", stiffness: 220, damping: 22 });
            animate(y, 0, { type: "spring", stiffness: 220, damping: 22 });
          }
        }}
      >
        {/* SKIP 提示（左滑） */}
        <motion.div
          className="absolute left-5 top-14 z-10 rotate-[-15deg] px-3 py-1.5 pointer-events-none"
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
          className="absolute right-5 top-14 z-10 rotate-[15deg] px-3 py-1.5 pointer-events-none"
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

        {/* DETAIL 提示（上滑） */}
        {onSwipeUp && (
          <motion.div
            className="absolute left-1/2 top-6 z-10 -translate-x-1/2 px-3 py-1.5 pointer-events-none"
            style={{
              opacity: upOpacity,
              border: "2px solid rgb(var(--accent-rgb) / 0.8)",
              borderRadius: 2,
              background: "rgb(var(--accent-rgb) / 0.08)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              className="text-sm font-black tracking-widest uppercase"
              style={{
                color: "var(--accent)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.2em",
                textShadow: "0 0 12px rgb(var(--accent-rgb) / 0.7)",
              }}
            >
              ↑ Detail
            </span>
          </motion.div>
        )}

        {/* 封面圖（無圖時顯示中央 glyph 作為 v3 placeholder） */}
        <div className="h-[52%] w-full relative overflow-hidden" style={{ background: "var(--panel-light)" }}>
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
        <div
          ref={scrollRef}
          className="h-[48%] overflow-y-auto overscroll-contain px-5 pt-4 pb-6"
          style={{ background: "var(--panel)" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
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

          <Link
            href={ROUTES.SPOT_DETAIL(spot.id)}
            className="inline-block mt-4 text-[11px] tracking-wider transition-opacity hover:opacity-70 uppercase"
            style={{
              color: "var(--accent)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.18em",
            }}
            onClick={(e) => {
              if (didDrag.current) {
                e.preventDefault();
                didDrag.current = false;
                return;
              }
              e.stopPropagation();
            }}
          >
            {t("viewDetail")}
          </Link>
        </div>
      </motion.div>
    );
  }
);
