"use client";

import { CATEGORY_OPTIONS } from "@/lib/constants/categories";
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

  // TODO: 路線最佳化（Haversine + 最近鄰演算法，見 docs/specs/2026-04-03-swipe-ui-design.md）
  // v1 暫時依照加入行程的順序排列

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
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-white/5 px-5 pt-5 pb-10">
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-base">今日行程</h3>
          {tripSpots.length > 0 && (
            <button onClick={handleClear} className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
              清空
            </button>
          )}
        </div>

        {tripSpots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-500 text-sm">還沒有加入任何地點</p>
            <p className="text-zinc-600 text-xs mt-1">按 + 把景點加入今日行程</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {tripSpots.map((spot, index) => {
              const color = CATEGORY_COLORS[spot.category] ?? "#6b7280";
              const label = CATEGORY_OPTIONS.find((c) => c.value === spot.category)?.label ?? spot.category;
              return (
                <div key={spot.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-zinc-800 border border-white/10 text-zinc-500 text-xs flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{spot.name}</p>
                    <span
                      className="text-xs font-medium"
                      style={{ color }}
                    >
                      {label}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromTrip(spot.id)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
                    aria-label="移除"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-zinc-600 text-xs text-center mb-4">
          {/* TODO: 路線最佳化後顯示預估步行時間 */}
          依加入順序排列，v2 加入最佳路線計算
        </p>

        <button
          onClick={handleNavigate}
          disabled={tripSpots.length === 0}
          className="w-full py-3.5 rounded-xl bg-white text-zinc-900 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          在 Google Maps 中導航
        </button>
      </div>
    </>
  );
}
