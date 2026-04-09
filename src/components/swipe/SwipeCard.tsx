"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { CATEGORY_OPTIONS } from "@/lib/constants/categories";
import { STATUS_LABELS } from "@/lib/constants/status";
import type { SpotMapPoint } from "@/types/spots";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

const SWIPE_THRESHOLD = 100;

const CATEGORY_COLORS: Record<SpotCategory, string> = {
  "weird-temple": "#f97316",
  "abandoned": "#6b7280",
  "giant-object": "#3b82f6",
  "kitsch": "#ec4899",
  "marginal-architecture": "#14b8a6",
  "urban-legend": "#8b5cf6",
  "absurd-landscape": "#22c55e",
  "odd-shopfront": "#eab308",
};

const STATUS_COLORS_DARK: Record<SpotStatus, string> = {
  active: "bg-green-500/15 text-green-400",
  uncertain: "bg-yellow-500/15 text-yellow-400",
  disappeared: "bg-zinc-700 text-zinc-400",
  pending: "bg-blue-500/15 text-blue-400",
};

const DIFFICULTY_LABELS = { easy: "容易", medium: "普通", hard: "困難" } as const;

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
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
    const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
    const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const categoryColor = CATEGORY_COLORS[spot.category] ?? "#6b7280";
    const categoryLabel =
      CATEGORY_OPTIONS.find((c) => c.value === spot.category)?.label ?? spot.category;
    const statusLabel = STATUS_LABELS[spot.status as SpotStatus] ?? spot.status;
    const statusColor =
      STATUS_COLORS_DARK[spot.status as SpotStatus] ?? "bg-zinc-700 text-zinc-400";

    const flyOut = (direction: "left" | "right") => {
      const target = direction === "left" ? -600 : 600;
      animate(x, target, { duration: 0.3, ease: "easeOut" }).then(() => {
        direction === "left" ? onSwipeLeft() : onSwipeRight();
      });
    };

    useImperativeHandle(ref, () => ({ flyOut }));

    if (!isTop) {
      return (
        <div
          className="absolute inset-0 rounded-3xl bg-zinc-800 border border-white/5"
          style={{ transform: "scale(0.95) translateY(12px)", zIndex: 0 }}
        />
      );
    }

    return (
      <motion.div
        className="absolute inset-0 rounded-3xl overflow-hidden border border-white/5 cursor-grab active:cursor-grabbing bg-zinc-900"
        style={{ x, rotate, zIndex: 1 }}
        drag="x"
        dragMomentum={false}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) flyOut("right");
          else if (info.offset.x < -SWIPE_THRESHOLD) flyOut("left");
          else animate(x, 0, { type: "spring", stiffness: 220, damping: 22 });
        }}
      >
        {/* 拖曳提示 overlay */}
        <motion.div
          className="absolute left-6 top-16 z-10 rotate-[-15deg] border-4 border-red-400 rounded-xl px-4 py-2 pointer-events-none"
          style={{ opacity: leftOpacity }}
        >
          <span className="text-red-400 text-2xl font-black tracking-widest">跳過</span>
        </motion.div>
        <motion.div
          className="absolute right-6 top-16 z-10 rotate-15 border-4 border-green-400 rounded-xl px-4 py-2 pointer-events-none"
          style={{ opacity: rightOpacity }}
        >
          <span className="text-green-400 text-2xl font-black tracking-widest">收藏</span>
        </motion.div>

        {/* 封面圖（上半部） */}
        <div className="h-[52%] w-full bg-zinc-800 relative">
          {spot.coverImage && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${spot.coverImage})` }}
            />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-zinc-900/60" />
        </div>

        {/* 可捲動內容區 */}
        <div
          ref={scrollRef}
          className="h-[48%] bg-zinc-900 overflow-y-auto overscroll-contain px-5 pt-4 pb-6"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
            >
              {categoryLabel}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-zinc-500">
              {DIFFICULTY_LABELS[spot.difficulty]}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white leading-tight">{spot.name}</h2>
          {spot.nameEn && (
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{spot.nameEn}</p>
          )}

          <Link
            href={ROUTES.SPOT_DETAIL(spot.id)}
            className="inline-block mt-4 text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-200 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            查看完整詳情 →
          </Link>
        </div>
      </motion.div>
    );
  }
);
