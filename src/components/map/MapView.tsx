"use client";

import { useState, useCallback, useMemo } from "react";
import { Map, AttributionControl, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { SpotMarker } from "./SpotMarker";
import { SpotPopup } from "./SpotPopup";
import { LocateMeButton } from "./LocateMeButton";
import { ScaleBar } from "./ScaleBar";
import { useAppStore } from "@/store/useAppStore";
import { useMapStore, type Bbox } from "@/store/useMapStore";
import { loadMapStyle } from "@/lib/mapbox/style-loader";
import type { SpotMapPoint } from "@/types/spots";

const TAIPEI_CENTER = { latitude: 25.0478, longitude: 121.5319, zoom: 11 };

interface MapViewProps {
  spots: SpotMapPoint[];
  userLocation: { lat: number; lng: number } | null;
  // mapRef 由父層持有（給 RadiusToggle / LocateMeButton 共用），這層只負責接上
  mapRef: React.RefObject<MapRef | null>;
  onExpandRadius?: () => void;
  onResetToRadius?: () => void;
  isError?: boolean;
  onRetry?: () => void;
}

export function MapView({ spots, userLocation, mapRef, onExpandRadius, onResetToRadius, isError, onRetry }: MapViewProps) {
  const [selectedSpot, setSelectedSpot] = useState<SpotMapPoint | null>(null);
  const [zoom, setZoom] = useState(TAIPEI_CENTER.zoom);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  // 跟著主題切換動態載入對應 mapbox style（style-loader 內已 cache）
  const theme = useAppStore((s) => s.theme);
  const mapStyle = useMemo(() => loadMapStyle(theme), [theme]);

  // dual-mode query state（用 setViewportBbox / setQueryMode 寫回 store）
  const queryMode = useMapStore((s) => s.queryMode);
  const radius = useMapStore((s) => s.radius);
  const setViewportBbox = useMapStore((s) => s.setViewportBbox);
  const setQueryMode = useMapStore((s) => s.setQueryMode);

  // initialViewState：使用者位置優先，否則台北中心
  // 為 uncontrolled prop，後續 userLocation 變動不會自動重定位（由 LocateMeButton 主動 flyTo）
  const initialViewState = useMemo(() => {
    if (userLocation) {
      return { latitude: userLocation.lat, longitude: userLocation.lng, zoom: 12 };
    }
    return TAIPEI_CENTER;
  }, [userLocation]);

  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    setZoom(Math.round(e.viewState.zoom));
  }, []);

  // 任何 moveend（含程式呼叫 flyTo / easeTo）都更新 bbox — 確保 viewport mode 下
  // 程式移動後仍有最新 bbox 可查詢
  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const bbox: Bbox = {
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    };
    setViewportBbox(bbox);
  }, [mapRef, setViewportBbox]);

  // 只有使用者真實互動（drag / zoom）才切換 queryMode 到 viewport
  // flyTo / easeTo 不會觸發這兩個 event，所以 LocateMe / RadiusToggle 飛地圖時 mode 不會被誤改
  const handleUserInteract = useCallback(() => {
    setQueryMode("viewport");
  }, [setQueryMode]);

  const handleMarkerClick = useCallback((spot: SpotMapPoint) => {
    setSelectedSpot((prev) => (prev?.id === spot.id ? null : spot));
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedSpot(null);
  }, []);

  // 空狀態文案：依當前模式給不同建議
  const renderEmptyState = () => {
    if (queryMode === "viewport") {
      return (
        <>
          <p className="text-sm font-content" style={{ color: "var(--muted)" }}>
            視圖範圍內暫無景點
          </p>
          {onResetToRadius && (
            <button
              onClick={onResetToRadius}
              className="mt-2 text-xs px-3 py-1.5 transition-colors uppercase"
              style={{
                borderRadius: 2,
                background: "rgb(var(--accent-rgb) / 0.1)",
                color: "var(--foreground)",
                border: "1px solid var(--line-strong)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.12em",
                cursor: "pointer",
              }}
            >
              回到附近 {radius}km
            </button>
          )}
        </>
      );
    }
    return (
      <>
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
              cursor: "pointer",
            }}
          >
            擴大搜尋範圍
          </button>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)", opacity: 0.6 }}>
            已是最大搜尋範圍
          </p>
        )}
      </>
    );
  };

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
        <>
          <Map
            ref={mapRef}
            mapboxAccessToken={token}
            initialViewState={initialViewState}
            mapStyle={mapStyle}
            onMove={handleMove}
            onMoveEnd={handleMoveEnd}
            onDragEnd={handleUserInteract}
            onZoomEnd={handleUserInteract}
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
          <ScaleBar mapRef={mapRef} />
          <LocateMeButton mapRef={mapRef} />
        </>
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
                  cursor: "pointer",
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
            {renderEmptyState()}
          </div>
        </div>
      )}
    </div>
  );
}
