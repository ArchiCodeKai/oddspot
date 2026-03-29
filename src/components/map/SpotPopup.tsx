"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { CATEGORY_OPTIONS } from "@/lib/constants/categories";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants/status";
import type { SpotMapPoint } from "@/types/spots";

interface SpotPopupProps {
  spot: SpotMapPoint;
  onClose: () => void;
}

const DIFFICULTY_LABELS = {
  easy: "容易",
  medium: "普通",
  hard: "困難",
} as const;

export function SpotPopup({ spot, onClose }: SpotPopupProps) {
  const categoryLabel =
    CATEGORY_OPTIONS.find((c) => c.value === spot.category)?.label ?? spot.category;
  const statusLabel = STATUS_LABELS[spot.status] ?? spot.status;
  const statusColor = STATUS_COLORS[spot.status] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-20 pointer-events-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/10 text-gray-600 text-sm hover:bg-black/20"
          aria-label="關閉"
        >
          ✕
        </button>

        <div className="p-4">
          <span className="text-xs text-gray-500 font-medium">{categoryLabel}</span>

          <h3 className="text-lg font-bold text-gray-900 mt-0.5 pr-8">{spot.name}</h3>
          {spot.nameEn && (
            <p className="text-sm text-gray-400 font-mono -mt-0.5">{spot.nameEn}</p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
              {statusLabel}
            </span>
            <span className="text-xs text-gray-400">
              {DIFFICULTY_LABELS[spot.difficulty]}
            </span>
          </div>

          <Link
            href={ROUTES.SPOT_DETAIL(spot.id)}
            className="block mt-3 w-full text-center py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
          >
            查看詳情
          </Link>
        </div>
      </div>
    </div>
  );
}
