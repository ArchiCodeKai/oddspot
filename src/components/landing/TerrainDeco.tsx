import type { CSSProperties } from "react";

interface TerrainDecoProps {
  style?: CSSProperties;
}

// 左下 contour line 地形裝飾 — 6 條波浪 + 網格樓地板投影
export function TerrainDeco({ style }: TerrainDecoProps) {
  return (
    <svg
      viewBox="0 0 340 180"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.5"
      style={{
        color: "var(--fg)",
        opacity: 0.7,
        pointerEvents: "none",
        ...style,
      }}
      aria-hidden="true"
    >
      <path d="M0 150 Q60 90 120 110 T240 130 T340 100" opacity="0.3" />
      <path d="M0 140 Q60 80 120 100 T240 120 T340 90"  opacity="0.4" />
      <path d="M0 130 Q60 70 120 90 T240 110 T340 80"  opacity="0.5" />
      <path d="M0 120 Q60 60 120 80 T240 100 T340 70"  opacity="0.6" />
      <path d="M0 110 Q60 50 120 70 T240 90 T340 60"   opacity="0.7" />
      <path d="M0 100 Q60 40 120 60 T240 80 T340 50"   opacity="0.8" />
      {/* 網格樓地板投影 */}
      <g transform="translate(0 150)" opacity="0.4">
        <line x1="0"   y1="0"  x2="340" y2="0" />
        <line x1="20"  y1="8"  x2="320" y2="8" />
        <line x1="40"  y1="16" x2="300" y2="16" />
        <line x1="0"   y1="0"  x2="20"  y2="8" />
        <line x1="60"  y1="0"  x2="70"  y2="16" />
        <line x1="120" y1="0"  x2="130" y2="16" />
        <line x1="180" y1="0"  x2="200" y2="16" />
        <line x1="240" y1="0"  x2="260" y2="16" />
        <line x1="300" y1="0"  x2="310" y2="16" />
        <line x1="340" y1="0"  x2="320" y2="16" />
      </g>
    </svg>
  );
}
