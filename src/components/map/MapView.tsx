"use client";

import { useState, useCallback } from "react";
import { APIProvider, Map, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { SpotMarker } from "./SpotMarker";
import { SpotPopup } from "./SpotPopup";
import { useAppStore } from "@/store/useAppStore";
import type { SpotMapPoint } from "@/types/spots";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };

// invert(1) hue-rotate(180deg) 能保留飽和色的色相（數學上互相抵消），
// 同時把原本的淺色地圖背景轉為深色，達到黑暗模式效果
const DARK_MAP_FILTER = "invert(1) hue-rotate(180deg) brightness(0.88) saturate(0.85)";

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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const isDark = useAppStore((s) => s.theme !== "light");

  const handleCameraChange = useCallback((e: MapCameraChangedEvent) => {
    setZoom(Math.round(e.detail.zoom));
  }, []);

  const handleMarkerClick = useCallback((spot: SpotMapPoint) => {
    setSelectedSpot((prev) => (prev?.id === spot.id ? null : spot));
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedSpot(null);
  }, []);

  const center = userLocation ?? TAIPEI_CENTER;

  return (
    <APIProvider apiKey={apiKey}>
      {/* data-cursor-map 在最外層，確保游標效果涵蓋整個地圖區域 */}
      <div className="relative w-full" style={{ height: "100%" }} data-cursor-map>

        {/* 地圖圖層：深色模式套用 CSS filter，不影響外層 UI 元素 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            filter: isDark ? DARK_MAP_FILTER : "none",
          }}
        >
          <Map
            defaultCenter={center}
            defaultZoom={14}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            onCameraChanged={handleCameraChange}
            gestureHandling="greedy"
            disableDefaultUI={true}
            style={{ width: "100%", height: "100%" }}
          >
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
        </div>

        {/* UI 覆蓋層：不受 filter 影響，顏色與主題一致 */}
        {selectedSpot && (
          <SpotPopup
            spot={selectedSpot}
            onClose={() => setSelectedSpot(null)}
          />
        )}

        {/* API 失敗：inline error，不跳頁 */}
        {isError && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div
              className="backdrop-blur-md rounded-2xl px-5 py-3 text-center"
              style={{
                background: "var(--panel-glass)",
                border: "1px solid var(--line)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <p className="text-sm font-content" style={{ color: "var(--foreground)" }}>
                無法載入景點
              </p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{
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
            <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 rounded-2xl px-5 py-3 text-center">
              <p className="text-zinc-400 text-sm">附近 {radius}km 內暫無景點</p>
              {onExpandRadius ? (
                <button
                  onClick={onExpandRadius}
                  className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-white/10 text-zinc-300 hover:bg-white/15 transition-colors"
                >
                  擴大至 {radius === 5 ? 10 : 20}km
                </button>
              ) : (
                <p className="text-zinc-600 text-xs mt-0.5">已是最大搜尋範圍</p>
              )}
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  );
}
