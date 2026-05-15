"use client";

import { Marker } from "react-map-gl/mapbox";
import type { SpotMapPoint } from "@/types/spots";

// 路線上的編號 / 起終點標記。
// - start: 8×8 方塊 var(--accent)（無 userLocation 時用）
// - waypoint: 16×16 圓圈含編號 01/02/03
// - end: 8×8 方塊 var(--foreground)（區分起終點）
//
// offset 把它推到 SpotMarker 淚滴 pin 上方避免重疊。
// SpotMarker 是 bottom-anchored、高 34px；這顆 anchor=center 再往上推 40px。

interface RouteWaypointMarkerProps {
  spot: SpotMapPoint;
  role: "start" | "waypoint" | "end";
  // role === "waypoint" 時的編號（從 1 開始）
  waypointNumber?: number;
}

const STACK_OFFSET: [number, number] = [0, -40];

export function RouteWaypointMarker({
  spot,
  role,
  waypointNumber,
}: RouteWaypointMarkerProps) {
  return (
    <Marker
      longitude={spot.lng}
      latitude={spot.lat}
      anchor="center"
      offset={STACK_OFFSET}
    >
      {role === "start" && (
        <div
          aria-hidden
          style={{
            width: 8,
            height: 8,
            background: "var(--accent)",
            pointerEvents: "none",
          }}
        />
      )}
      {role === "end" && (
        <div
          aria-hidden
          style={{
            width: 8,
            height: 8,
            background: "var(--foreground)",
            pointerEvents: "none",
          }}
        />
      )}
      {role === "waypoint" && (
        <div
          aria-hidden
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--background)",
            border: "1px solid var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.05em",
            lineHeight: 1,
            pointerEvents: "none",
          }}
        >
          {String(waypointNumber ?? 0).padStart(2, "0")}
        </div>
      )}
    </Marker>
  );
}
