"use client";

import { useState, useCallback, useMemo } from "react";
import { Map, AttributionControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { SpotMarker } from "./SpotMarker";
import { SpotPopup } from "./SpotPopup";
import { useAppStore } from "@/store/useAppStore";
import { loadMapStyle } from "@/lib/mapbox/style-loader";
import type { SpotMapPoint } from "@/types/spots";

const TAIPEI_CENTER = { latitude: 25.0478, longitude: 121.5319, zoom: 14 };

interface MapViewProps {
  spots: SpotMapPoint[];
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  onExpandRadius?: () => void;
  isError?: boolean;
  onRetry?: () => void;
}

export function MapView({ spots, userLocation, radius, onExpandRadius, isError, onRetry }: MapViewProps) {
  const [selectedSpot, setSelectedSpot] = useState<SpotMapPoint | null>(null);
  const [zoom, setZoom] = useState(14);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  // 跟著主題切換動態載入對應 mapbox style（style-loader 內已 cache）
  const theme = useAppStore((s) => s.theme);
  const mapStyle = useMemo(() => loadMapStyle(theme), [theme]);

  // initialViewState 為 uncontrolled，userLocation 後續變動不重定位（與舊版行為一致）
  const initialViewState = useMemo(() => {
    if (userLocation) {
      return { latitude: userLocation.lat, longitude: userLocation.lng, zoom: 14 };
    }
    return TAIPEI_CENTER;
  }, [userLocation]);

  const handleMove = useCallback((e: { viewState: { zoom: number } }) => {
    setZoom(Math.round(e.viewState.zoom));
  }, []);

  const handleMarkerClick = useCallback((spot: SpotMapPoint) => {
    setSelectedSpot((prev) => (prev?.id === spot.id ? null : spot));
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedSpot(null);
  }, []);

  return (
    <div className="relative w-full" style={{ height: "100%" }} data-cursor-map>
      {!token ? (
        // 未設定 token 時 fallback：保留 acid 風格錯誤訊息
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "var(--background)" }}
        >
          <div
            className="px-6 py-4 text-center"
            style={{
              background: "var(--panel-glass-strong)",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.12em",
              color: "var(--foreground)",
            }}
          >
            <div className="text-xs uppercase opacity-50">err_no_token</div>
            <div className="text-sm uppercase mt-1">NEXT_PUBLIC_MAPBOX_TOKEN 未設定</div>
          </div>
        </div>
      ) : (
        <Map
          mapboxAccessToken={token}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          onMove={handleMove}
          onClick={handleMapClick}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          <AttributionControl compact />
          {spots.map((spot) => (
            <SpotMarker
              key={spot.id}
              spot={spot}
              isSelected={selectedSpot?.id === spot.id}
              zoom={zoom}
              onClick={handleMarkerClick}
            />
          ))}
        </Map>
      )}

      {/* UI 覆蓋層：不在 Map 內，不受 mapbox 影響 */}
      {selectedSpot && (
        <SpotPopup
          spot={selectedSpot}
          userLocation={userLocation}
          onClose={() => setSelectedSpot(null)}
        />
      )}

      {/* API 失敗：inline error，不跳頁 */}
      {isError && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div
            className="backdrop-blur-md px-5 py-3 text-center"
            style={{
              background: "var(--panel-glass-strong)",
              border: "1px solid var(--line-strong)",
              borderRadius: 2,
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <p className="text-sm font-content" style={{ color: "var(--foreground)" }}>
              無法載入景點
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 text-xs px-3 py-1.5 transition-colors"
                style={{
                  borderRadius: 2,
                  background: "rgb(var(--accent-rgb) / 0.15)",
                  color: "var(--accent)",
                  border: "1px solid rgb(var(--accent-rgb) / 0.3)",
                }}
              >
                重試
              </button>
            )}
          </div>
        </div>
      )}

      {spots.length === 0 && !selectedSpot && !isError && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div
            className="backdrop-blur-md px-5 py-3 text-center"
            style={{
              background: "var(--panel-glass-strong)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <p className="text-sm font-content" style={{ color: "var(--muted)" }}>
              附近 {radius}km 內暫無景點
            </p>
            {onExpandRadius ? (
              <button
                onClick={onExpandRadius}
                className="mt-2 text-xs px-3 py-1.5 transition-colors uppercase"
                style={{
                  borderRadius: 2,
                  background: "rgb(var(--accent-rgb) / 0.1)",
                  color: "var(--foreground)",
                  border: "1px solid var(--line-strong)",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  letterSpacing: "0.12em",
                }}
              >
                擴大至 {radius === 5 ? 10 : 20}km
              </button>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)", opacity: 0.6 }}>
                已是最大搜尋範圍
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
