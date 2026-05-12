"use client";

import { useState, useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/mapbox";

interface LocateMeButtonProps {
  mapRef: React.RefObject<MapRef | null>;
}

type Status = "idle" | "locating" | "ok" | "denied" | "error";

export function LocateMeButton({ mapRef }: LocateMeButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  // 顯示提示後 1.5s 自動消失
  useEffect(() => {
    if (status !== "ok" && status !== "denied" && status !== "error") return;
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setStatus("idle");
    }, 1500);
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [status]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setStatus("ok");
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 800 });
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
    );
  };

  return (
    <>
      <button
        onClick={handleLocate}
        aria-label="定位到我"
        disabled={status === "locating"}
        style={{
          position: "absolute",
          right: 16,
          bottom: 88,
          width: 44,
          height: 44,
          background: "var(--panel-glass-strong)",
          border: "1px solid var(--line-strong)",
          borderRadius: 2,
          backdropFilter: "blur(8px)",
          cursor: status === "locating" ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 5,
          color: "var(--accent)",
          opacity: status === "locating" ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {/* 十字準星 */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {/* 狀態提示（acid 風格） */}
      {(status === "ok" || status === "denied" || status === "error") && (
        <div
          style={{
            position: "absolute",
            right: 70,
            bottom: 96,
            padding: "8px 12px",
            background: "var(--panel-glass-strong)",
            border: "1px solid var(--line-strong)",
            borderRadius: 2,
            color: "var(--foreground)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          {status === "ok" && coords && (
            <>
              located · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </>
          )}
          {status === "denied" && "permission denied · 開啟系統設定 > 定位"}
          {status === "error" && "err_gps · 訊號失蹤"}
        </div>
      )}
    </>
  );
}
