"use client";

import { useTranslations } from "next-intl";
import { getCategoryLabel } from "@/lib/i18n/spotMeta";
import { useSwipeStore } from "@/store/useSwipeStore";
import type { SpotMapPoint } from "@/types/spots";
import type { SpotCategory } from "@/lib/constants/categories";

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

interface TripPlanSheetProps {
  isOpen: boolean;
  onClose: () => void;
  spots: SpotMapPoint[];
  userLocation: { lat: number; lng: number } | null;
}

function buildMapsUrl(
  orderedSpots: SpotMapPoint[],
  userLocation: { lat: number; lng: number } | null
): string {
  if (orderedSpots.length === 0) return "";

  // TODO: 路線最佳化（v2 加入最近鄰演算法）
  const last = orderedSpots[orderedSpots.length - 1];
  const waypoints = orderedSpots
    .slice(0, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");

  const base = "https://www.google.com/maps/dir/?api=1";
  const origin = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : "";
  const dest = `&destination=${last.lat},${last.lng}`;
  const wp = waypoints ? `&waypoints=${waypoints}` : "";

  return `${base}${origin}${dest}${wp}&travelmode=walking`;
}

export function TripPlanSheet({ isOpen, onClose, spots, userLocation }: TripPlanSheetProps) {
  const t = useTranslations("tripPlan");
  const tMeta = useTranslations("spotMeta");
  const { tripSpotIds, removeFromTrip, clearSession } = useSwipeStore();

  const tripSpots = tripSpotIds
    .map((id) => spots.find((s) => s.id === id))
    .filter((s): s is SpotMapPoint => Boolean(s));

  const mapsUrl = buildMapsUrl(tripSpots, userLocation);

  const handleNavigate = () => {
    if (!mapsUrl) return;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleClear = () => {
    clearSession();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgb(var(--background-rgb) / 0.65)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 px-5 pt-5 pb-10"
        style={{
          background: "var(--panel-glass-strong)",
          borderTop: "1px solid var(--line)",
          borderRadius: "20px 20px 0 0",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -8px 40px rgb(var(--background-rgb) / 0.3)",
        }}
      >
        {/* 拖曳把手 */}
        <div
          className="w-10 h-1 rounded-full mx-auto mb-5"
          style={{ background: "var(--muted)", opacity: 0.35 }}
        />

        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-base font-semibold font-content"
            style={{ color: "var(--foreground)" }}
          >
            {t("title")}
          </h3>
          {tripSpots.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs transition-colors"
              style={{ color: "var(--muted)", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            >
              {t("clear")}
            </button>
          )}
        </div>

        {tripSpots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-content" style={{ color: "var(--muted)" }}>
              {t("emptyTitle")}
            </p>
            <p className="text-xs mt-1 font-content" style={{ color: "var(--muted)", opacity: 0.6 }}>
              {t("emptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {tripSpots.map((spot, index) => {
              const color = CATEGORY_COLORS[spot.category] ?? "#6b7280";
              const label = getCategoryLabel(tMeta, spot.category);
              return (
                <div key={spot.id} className="flex items-center gap-3">
                  {/* 序號 */}
                  <span
                    className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center flex-shrink-0 font-bold"
                    style={{
                      background: "var(--panel-light)",
                      border: "1px solid var(--line)",
                      color: "var(--muted)",
                    }}
                  >
                    {index + 1}
                  </span>

                  {/* 景點資訊 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate font-content" style={{ color: "var(--foreground)" }}>
                      {spot.name}
                    </p>
                    <span className="text-xs font-medium font-content" style={{ color }}>
                      {label}
                    </span>
                  </div>

                  {/* 移除按鈕 */}
                  <button
                    onClick={() => removeFromTrip(spot.id)}
                    className="flex-shrink-0 transition-colors"
                    style={{ color: "var(--muted)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                    aria-label={t("remove")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-center mb-4 font-content" style={{ color: "var(--muted)", opacity: 0.55 }}>
          {t("routeHint")}
        </p>

        <button
          onClick={handleNavigate}
          disabled={tripSpots.length === 0}
          className="w-full py-3.5 text-sm font-semibold font-content transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderRadius: "10px",
            background: tripSpots.length > 0 ? "var(--foreground)" : "var(--panel-light)",
            color: "var(--background)",
            cursor: tripSpots.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          {t("navigate")}
        </button>
      </div>
    </>
  );
}
