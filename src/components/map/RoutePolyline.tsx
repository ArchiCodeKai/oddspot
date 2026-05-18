"use client";

import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/mapbox";
import type { LineLayerSpecification } from "mapbox-gl";
import type { Feature, LineString } from "geojson";
import { useAppStore } from "@/store/useAppStore";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";

// 路線實線。Mapbox style 的 paint 不支援 CSS var，
// 所以 theme 切換時要重讀 --accent 的計算值。
//
// 視覺：1px、無 glow、無漸層、butt cap、miter join（acid 風格）
//
// 使用者選 D：不做進場動畫，route 一進 store 就直接出現。

const FALLBACK_ACCENT = "#5fd9c0"; // terminal 主題 fallback

function readAccent(): string {
  if (typeof window === "undefined") return FALLBACK_ACCENT;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  return value || FALLBACK_ACCENT;
}

export function RoutePolyline() {
  const theme = useAppStore((s) => s.theme);
  const route = useRoutePlannerStore((s) => s.route);

  // theme 變動時重算 hex 顏色
  const lineColor = useMemo(() => readAccent(), [theme]);

  if (!route) return null;

  const feature: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: route.geometry,
  };

  const paint: LineLayerSpecification["paint"] = {
    "line-color": lineColor,
    "line-width": 1,
    "line-opacity": 1,
  };

  const layout: LineLayerSpecification["layout"] = {
    "line-cap": "butt",
    "line-join": "miter",
  };

  return (
    <Source id="oddspot-route" type="geojson" data={feature}>
      <Layer id="oddspot-route-line" type="line" paint={paint} layout={layout} />
    </Source>
  );
}
