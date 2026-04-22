"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/constants/routes";
import { CATEGORY_COLORS, type SpotCategory } from "@/lib/constants/categories";
import { STATUS_TEXT_COLORS, type SpotStatus } from "@/lib/constants/status";
import { getCategoryLabel, getStatusLabel } from "@/lib/i18n/spotMeta";
import type { SpotMapPoint } from "@/types/spots";

const SWIPE_THRESHOLD = 100;

type DifficultyKey = "easy" | "medium" | "hard";

export interface SwipeCardHandle {
  flyOut: (direction: "left" | "right") => void;
}

interface SwipeCardProps {
  spot: SpotMapPoint;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({ spot, onSwipeLeft, onSwipeRight, isTop }, ref) {
    const t = useTranslations("swipe");
    const tMeta = useTranslations("spotMeta");
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
    const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
    const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const categoryColor = CATEGORY_COLORS[spot.category] ?? "#6b7280";
    const categoryLabel = getCategoryLabel(tMeta, spot.category);
    const statusLabel = getStatusLabel(tMeta, spot.status as SpotStatus);
    const statusColor = STATUS_TEXT_COLORS[spot.status as SpotStatus] ?? "text-[var(--muted)]";

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
          className="absolute inset-0 rounded-3xl"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            transform: "scale(0.95) translateY(12px)",
            zIndex: 0,
            boxShadow: "var(--shadow-glow)",
          }}
        />
      );
    }

    return (
      <motion.div
        className="absolute inset-0 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={{
          x,
          rotate,
          zIndex: 1,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-glow)",
        }}
        drag="x"
        dragMomentum={false}
        dragElastic={0.2}
        onDragStart={() => { didDrag.current = false; }}
        onDrag={() => { didDrag.current = true; }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) flyOut("right");
          else if (info.offset.x < -SWIPE_THRESHOLD) flyOut("left");
          else animate(x, 0, { type: "spring", stiffness: 220, damping: 22 });
        }}
      >
        {/* 跳過提示 */}
        <motion.div
          className="absolute left-5 top-14 z-10 rotate-[-15deg] rounded-sm px-3 py-1.5 pointer-events-none"
          style={{ opacity: leftOpacity, border: "2px solid rgba(239,68,68,0.8)" }}
        >
          <span className="text-red-400 text-xl font-black tracking-widest font-content">
            {t("skip")}
          </span>
        </motion.div>
        <motion.div
          className="absolute right-5 top-14 z-10 rotate-[15deg] rounded-sm px-3 py-1.5 pointer-events-none"
          style={{ opacity: rightOpacity, border: "2px solid rgb(var(--accent-rgb) / 0.8)" }}
        >
          <span style={{ color: "var(--accent)" }} className="text-xl font-black tracking-widest font-content">
            {t("save")}
          </span>
        </motion.div>

        {/* 封面圖 */}
        <div className="h-[52%] w-full relative" style={{ background: "var(--panel-light)" }}>
          {spot.coverImage && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${spot.coverImage})` }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 50%, rgb(var(--panel-rgb)) 100%)",
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
            <span
              className="text-[10px] px-2 py-0.5 rounded-sm font-medium tracking-wider"
              style={{
                backgroundColor: `${categoryColor}18`,
                color: categoryColor,
                border: `1px solid ${categoryColor}30`,
              }}
            >
              {categoryLabel}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-sm font-medium tracking-wider ${statusColor}`}
              style={{
                background: "rgb(var(--accent-rgb) / 0.06)",
                border: "1px solid var(--line)",
              }}
            >
              {statusLabel}
            </span>
            <span className="text-[10px] tracking-wider" style={{ color: "var(--muted)" }}>
              {t(`difficulty.${spot.difficulty as DifficultyKey}`)}
            </span>
          </div>

          {/* 景點名稱：中文用 Noto Sans TC 閱讀最佳化 */}
          <h2 className="text-lg font-bold leading-snug font-content" style={{ color: "var(--foreground)" }}>
            {spot.name}
          </h2>
          {spot.nameEn && (
            <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--muted)" }}>
              {spot.nameEn}
            </p>
          )}

          <Link
            href={ROUTES.SPOT_DETAIL(spot.id)}
            className="inline-block mt-4 text-[11px] tracking-wider transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)" }}
            onClick={(e) => {
              // 若剛才發生拖曳，攔截 click 避免誤觸 navigation
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
