"use client";

import { useState, useCallback } from "react";
import { APIProvider, Map, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { SpotMarker } from "./SpotMarker";
import { SpotPopup } from "./SpotPopup";
import type { SpotMapPoint } from "@/types/spots";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };

// invert(1) hue-rotate(180deg) 能保留飽和色的色相（數學上互相抵消），
// 同時把原本的淺色地圖背景轉為深色，達到黑暗模式效果
// v3 鐵灰背景搭配：brightness 0.92（比舊 0.88 亮一階），saturate 0.92 配薄荷柔光
const DARK_MAP_FILTER = "invert(1) hue-rotate(180deg) brightness(0.92) saturate(0.92)";

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
            filter: DARK_MAP_FILTER,
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
    </APIProvider>
  );
}
