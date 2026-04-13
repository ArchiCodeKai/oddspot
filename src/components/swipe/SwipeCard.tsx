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

const STATUS_COLORS: Record<SpotStatus, string> = {
  active:      "text-[#00e5cc]",
  uncertain:   "text-yellow-400",
  disappeared: "text-[#4e8278]",
  pending:     "text-blue-400",
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
    const statusColor = STATUS_COLORS[spot.status as SpotStatus] ?? "text-[#4e8278]";

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
          className="absolute inset-0 rounded-3xl"
          style={{
            background: "#091310",
            border: "1px solid rgba(0,229,204,0.06)",
            transform: "scale(0.95) translateY(12px)",
            zIndex: 0,
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
          background: "#091310",
          border: "1px solid rgba(0,229,204,0.1)",
        }}
        drag="x"
        dragMomentum={false}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_THRESHOLD) flyOut("right");
          else if (info.offset.x < -SWIPE_THRESHOLD) flyOut("left");
          else animate(x, 0, { type: "spring", stiffness: 220, damping: 22 });
        }}
      >
        {/* 跳過提示 */}
        <motion.div
          className="absolute left-5 top-14 z-10 rotate-[-15deg] rounded-sm px-3 py-1.5 pointer-events-none"
          style={{
            opacity: leftOpacity,
            border: "2px solid rgba(239,68,68,0.8)",
          }}
        >
          <span className="text-red-400 text-xl font-black tracking-widest">跳過</span>
        </motion.div>
        <motion.div
          className="absolute right-5 top-14 z-10 rotate-[15deg] rounded-sm px-3 py-1.5 pointer-events-none"
          style={{
            opacity: rightOpacity,
            border: "2px solid rgba(0,229,204,0.8)",
          }}
        >
          <span style={{ color: "#00e5cc" }} className="text-xl font-black tracking-widest">
            收藏
          </span>
        </motion.div>

        {/* 封面圖 */}
        <div className="h-[52%] w-full relative" style={{ background: "#0c1a14" }}>
          {spot.coverImage && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${spot.coverImage})` }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, transparent 50%, #091310 100%)",
            }}
          />
        </div>

        {/* 內容區 */}
        <div
          ref={scrollRef}
          className="h-[48%] overflow-y-auto overscroll-contain px-5 pt-4 pb-6"
          style={{ background: "#091310" }}
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
              style={{ background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.12)" }}
            >
              {statusLabel}
            </span>
            <span className="text-[10px] tracking-wider" style={{ color: "var(--muted)" }}>
              {DIFFICULTY_LABELS[spot.difficulty]}
            </span>
          </div>

          <h2 className="text-lg font-bold leading-tight" style={{ color: "#d8f0e9" }}>
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
            onClick={(e) => e.stopPropagation()}
          >
            查看完整詳情 →
          </Link>
        </div>
      </motion.div>
    );
  }
);
