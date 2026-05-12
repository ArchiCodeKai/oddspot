"use client";

import { useEffect, useRef, useState } from "react";
import type { MapRef } from "react-map-gl/mapbox";

// 漂亮的距離數字（公尺）— 從 1m 到 1000km
// 比例尺挑選邏輯：找小於「視覺最大寬度可表示距離」的最大值
const NICE_METERS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500,
  1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000,
];

const MAX_WIDTH = 80; // px — 比例尺視覺最大像素寬度

interface ScaleInfo {
  width: number;
  label: string;
}

interface ScaleBarProps {
  mapRef: React.RefObject<MapRef | null>;
}

// Acid 風格比例尺，貼齊 LocateMeButton 左側
// 訂閱 mapbox 的 move / zoom event，每次變動重新計算「漂亮距離」對應的像素長度
export function ScaleBar({ mapRef }: ScaleBarProps) {
  const [info, setInfo] = useState<ScaleInfo | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let attached = false;

    const recompute = () => {
      const map = mapRef.current;
      if (!map) return;
      const center = map.getCenter();
      const zoom = map.getZoom();
      // Mapbox Mercator：緯度越高，1 pixel 對應越少米
      const metersPerPixel =
        (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
      const maxMeters = MAX_WIDTH * metersPerPixel;

      // 找小於 maxMeters 的最大 nice number
      let chosen = NICE_METERS[0];
      for (const n of NICE_METERS) {
        if (n > maxMeters) break;
        chosen = n;
      }
      const width = chosen / metersPerPixel;
      const label = chosen >= 1000 ? `${chosen / 1000} KM` : `${chosen} M`;
      setInfo({ width, label });
    };

    // map 還沒 ready 時 retry（react-map-gl 內部 init 有時序）
    const tryAttach = () => {
      const map = mapRef.current;
      if (!map) {
        retryTimerRef.current = window.setTimeout(tryAttach, 80);
        return;
      }
      attached = true;
      recompute();
      map.on("move", recompute);
      map.on("zoom", recompute);
    };

    tryAttach();

    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      if (attached) {
        const map = mapRef.current;
        if (map) {
          map.off("move", recompute);
          map.off("zoom", recompute);
        }
      }
    };
  }, [mapRef]);

  if (!info) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        // LocateMeButton 在 right:16 + 寬 44 + 8 gap = 68，比例尺右邊緣對齊
        right: 68,
        // LocateMeButton bottom:88，比例尺底邊對齊
        bottom: 88,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 2,
        pointerEvents: "none",
        // 淡淡的背景讓文字在亮地圖上也讀得到（雖然 v3 monochrome 多半深底）
        padding: "2px 4px",
        background: "rgb(var(--background-rgb) / 0.4)",
        backdropFilter: "blur(4px)",
        borderRadius: 2,
      }}
    >
      <span
        style={{
          fontSize: 10,
          lineHeight: 1,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          letterSpacing: "0.14em",
          color: "var(--accent)",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {info.label}
      </span>
      <svg
        width={Math.max(info.width, 1)}
        height={8}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* ┌──────┐ 形狀：左右立板 + 底線，acid wireframe 標準寫法 */}
        <path
          d={`M 0.5 0 L 0.5 7.5 L ${Math.max(info.width - 0.5, 1)} 7.5 L ${Math.max(info.width - 0.5, 1)} 0`}
          stroke="var(--accent)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="square"
        />
      </svg>
    </div>
  );
}
