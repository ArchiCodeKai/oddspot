"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, type MapRef, type ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppStore } from "@/store/useAppStore";
import { loadMapStyle } from "@/lib/mapbox/style-loader";

interface SubmitLocationMapPreviewProps {
  lat: number;
  lng: number;
  resetKey: number;
  onLocationChange: (coords: { lat: number; lng: number }) => void;
}

const previewMinZoom = 13;
const previewZoom = 16;

export function SubmitLocationMapPreview({ lat, lng, resetKey, onLocationChange }: SubmitLocationMapPreviewProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const theme = useAppStore((s) => s.theme);
  const mapStyle = useMemo(() => loadMapStyle(theme), [theme]);
  const mapRef = useRef<MapRef | null>(null);
  const lastResetKeyRef = useRef(resetKey);
  const [viewState, setViewState] = useState({
    latitude: lat,
    longitude: lng,
    zoom: previewZoom,
  });

  useEffect(() => {
    setViewState((current) => {
      const shouldResetZoom = lastResetKeyRef.current !== resetKey;
      lastResetKeyRef.current = resetKey;

      return {
        latitude: lat,
        longitude: lng,
        zoom: shouldResetZoom ? previewZoom : current.zoom,
      };
    });
  }, [lat, lng, resetKey]);

  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    const nextLat = Number(event.viewState.latitude.toFixed(6));
    const nextLng = Number(event.viewState.longitude.toFixed(6));
    onLocationChange({ lat: nextLat, lng: nextLng });
  };

  const handleMapLoad = () => {
    mapRef.current?.getMap().touchZoomRotate.disableRotation();
  };

  if (!token) {
    return (
      <div className="rounded-xs border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs text-zinc-500">
        缺少 Mapbox token，位置已讀取但暫時無法顯示地圖預覽。
      </div>
    );
  }

  return (
    <div
      className="submit-map-preview relative overflow-hidden rounded-xs border border-zinc-800 bg-zinc-950"
      aria-label={`可拖曳地圖位置預覽 ${lat.toFixed(6)}, ${lng.toFixed(6)}`}
    >
      <style>
        {`
          .submit-map-preview .mapboxgl-ctrl-logo {
            opacity: 0.56;
            transition: opacity 150ms ease;
          }

          .submit-map-preview .mapboxgl-ctrl-logo:hover,
          .submit-map-preview .mapboxgl-ctrl-logo:focus-visible {
            opacity: 0.9;
          }
        `}
      </style>
      <div className="relative h-[280px] w-full cursor-grab active:cursor-grabbing">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={(event) => setViewState(event.viewState)}
          onMoveEnd={handleMoveEnd}
          onLoad={handleMapLoad}
          mapboxAccessToken={token}
          mapStyle={mapStyle}
          attributionControl={false}
          minZoom={previewMinZoom}
          maxZoom={previewZoom}
          dragRotate={false}
          touchZoomRotate={true}
          touchPitch={false}
          pitchWithRotate={false}
          scrollZoom={true}
          doubleClickZoom={false}
          style={{ width: "100%", height: "100%" }}
        />
        <div className="center-pin pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border"
            style={{
              borderColor: "rgb(var(--accent-rgb) / 0.78)",
              background: "rgb(var(--background-rgb) / 0.82)",
              boxShadow: "0 0 22px rgb(var(--accent-rgb) / 0.28)",
            }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-500">
        <span>拖曳或縮放地圖微調位置</span>
        <span className="text-right font-mono text-zinc-400">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </span>
      </div>
    </div>
  );
}
