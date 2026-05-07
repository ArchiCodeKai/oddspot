"use client";

import { useMemo, useState } from "react";
import { Map, AttributionControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { loadMapStyle, MAP_THEMES, type MapTheme } from "@/lib/mapbox/style-loader";

const TAIPEI_CENTER = { latitude: 25.0478, longitude: 121.5319, zoom: 12 };

export default function StyleInspectorPage() {
  const [theme, setTheme] = useState<MapTheme>("terminal");
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  // 切換 theme 時重算 style 物件（style-loader 內已 cache，第二次起 0 cost）
  const mapStyle = useMemo(() => loadMapStyle(theme), [theme]);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      <Map
        mapboxAccessToken={token}
        initialViewState={TAIPEI_CENTER}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
      >
        <AttributionControl compact />
      </Map>

      <header
        className="absolute top-4 left-4 px-4 py-2 backdrop-blur-md"
        style={{
          background: "var(--panel-glass-strong)",
          border: "1px solid var(--line-strong)",
          borderRadius: 2,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          color: "var(--foreground)",
          letterSpacing: "0.12em",
        }}
      >
        <div className="text-xs uppercase opacity-50">dev/style-inspector</div>
        <div className="text-sm uppercase mt-0.5">map theme: {theme}</div>
      </header>

      <nav
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1"
        style={{
          background: "var(--panel-glass-strong)",
          border: "1px solid var(--line-strong)",
          borderRadius: 2,
          backdropFilter: "blur(8px)",
        }}
      >
        {MAP_THEMES.map((t) => {
          const active = t === theme;
          return (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className="px-4 py-2 text-xs uppercase transition-colors"
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                letterSpacing: "0.12em",
                background: active ? "rgb(var(--accent-rgb) / 0.18)" : "transparent",
                color: active ? "var(--accent)" : "var(--muted)",
                border: active ? "1px solid var(--line-strong)" : "1px solid transparent",
                borderRadius: 2,
              }}
            >
              {t}
            </button>
          );
        })}
      </nav>

      {!token && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 text-center"
          style={{
            background: "var(--panel-glass-strong)",
            border: "1px solid var(--line-strong)",
            borderRadius: 2,
            color: "var(--foreground)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            letterSpacing: "0.12em",
          }}
        >
          <div className="text-xs uppercase opacity-50">err_no_token</div>
          <div className="text-sm uppercase mt-1">NEXT_PUBLIC_MAPBOX_TOKEN 未設定</div>
        </div>
      )}
    </div>
  );
}
