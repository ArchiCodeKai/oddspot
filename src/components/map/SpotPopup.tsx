"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/constants/routes";
import { getCategoryLabel, getDifficultyLabel, getStatusLabel } from "@/lib/i18n/spotMeta";
import type { SpotMapPoint } from "@/types/spots";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

interface SpotPopupProps {
  spot: SpotMapPoint;
  onClose: () => void;
}

// 深色主題版本的狀態 badge 顏色
const STATUS_COLORS_DARK: Record<SpotStatus, string> = {
  active: "bg-green-500/15 text-green-400",
  uncertain: "bg-yellow-500/15 text-yellow-400",
  disappeared: "bg-zinc-700 text-zinc-400",
  pending: "bg-blue-500/15 text-blue-400",
};

// 分類對應色（與 SpotMarker 一致）
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

export function SpotPopup({ spot, onClose }: SpotPopupProps) {
  const tMeta = useTranslations("spotMeta");
  const tSwipe = useTranslations("swipe");
  const categoryLabel = getCategoryLabel(tMeta, spot.category);
  const statusLabel = getStatusLabel(tMeta, spot.status);
  const statusColor = STATUS_COLORS_DARK[spot.status] ?? "bg-zinc-700 text-zinc-400";
  const categoryColor = CATEGORY_COLORS[spot.category] ?? "#6b7280";

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-20 pointer-events-auto">
      <div className="bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-white/5">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 text-zinc-400 text-sm hover:bg-white/20 transition-colors"
          aria-label="關閉"
        >
          ✕
        </button>

        <div className="p-4">
          {/* 分類 badge（帶顏色） */}
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${categoryColor}20`,
              color: categoryColor,
            }}
          >
            {categoryLabel}
          </span>

          <h3 className="text-lg font-bold text-white mt-1.5 pr-8">{spot.name}</h3>
          {spot.nameEn && (
            <p className="text-sm text-zinc-500 font-mono -mt-0.5">{spot.nameEn}</p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-zinc-500">
              {getDifficultyLabel(tMeta, spot.difficulty)}
            </span>
          </div>

          <Link
            href={ROUTES.SPOT_DETAIL(spot.id)}
            className="block mt-3 w-full text-center py-2.5 bg-white text-zinc-900 text-sm font-semibold rounded-xl hover:bg-zinc-100 transition-colors"
          >
            {tSwipe("viewDetail")}
          </Link>
        </div>
      </div>
    </div>
  );
}
