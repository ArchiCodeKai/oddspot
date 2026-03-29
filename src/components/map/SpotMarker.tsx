"use client";

import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotMapPoint } from "@/types/spots";

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

interface SpotMarkerProps {
  spot: SpotMapPoint;
  isSelected: boolean;
  onClick: (spot: SpotMapPoint) => void;
}

export function SpotMarker({ spot, isSelected, onClick }: SpotMarkerProps) {
  const color = CATEGORY_COLORS[spot.category] ?? "#6b7280";

  return (
    <AdvancedMarker
      position={{ lat: spot.lat, lng: spot.lng }}
      onClick={() => onClick(spot)}
    >
      <div
        style={{
          width: isSelected ? 20 : 14,
          height: isSelected ? 20 : 14,
          borderRadius: "50%",
          backgroundColor: color,
          border: `2px solid ${isSelected ? "#fff" : "rgba(255,255,255,0.7)"}`,
          boxShadow: isSelected
            ? `0 0 0 3px ${color}66, 0 2px 8px rgba(0,0,0,0.3)`
            : "0 1px 4px rgba(0,0,0,0.25)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      />
    </AdvancedMarker>
  );
}
