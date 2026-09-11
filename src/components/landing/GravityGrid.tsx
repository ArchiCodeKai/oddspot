"use client";

import { useEffect, useMemo, useState } from "react";

// 重力網格：地球「壓」在一張線框網格上，網格朝地球微微塌陷。
// 2D SVG 而非 Three.js——參考圖本身是平面扭曲網格，SVG 能守住 0.5–1px 的脆弱線框，
// 且左側漸淡用 CSS mask 最乾淨，不必碰凍結的 3D 場景。
//
// 重力中心不用手調：用 GlobeScene 的投影常數（camera z=4、fov 50、idle 時地球群組 x=1.4）
// 依視窗尺寸算出地球在畫面上的位置與半徑，任何寬度都對得準。

const CAMERA_Z = 4;
const FOV_DEG = 50;
const EARTH_X_WORLD = 1.4;   // GlobeScene: dg.position.x = 1.0 + dissolveProgress * 0.4，idle 時 = 1.4
const RIM_WORLD = 1.065;     // AtmosphereShell 半徑：網格貼著大氣邊緣，不穿進點雲

interface GravityGridProps {
  /** 格距 px */
  cell?: number;
  /** 塌陷幅度（地球半徑的倍數）；使用者要「微微」，預設偏小 */
  pull?: number;
  /** 影響範圍（地球半徑的倍數） */
  reach?: number;
  /** 左側完全透明的 x 比例（文字區） */
  fadeStart?: number;
  /** 完全顯示的 x 比例 */
  fadeEnd?: number;
  opacity?: number;
  className?: string;
}

function useViewport() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

export function GravityGrid({
  cell = 44,
  pull = 0.22,
  reach = 1.1,
  fadeStart = 0.34,
  fadeEnd = 0.56,
  opacity = 0.16,
  className,
}: GravityGridProps) {
  const { w, h } = useViewport();

  const { paths, cx, cy } = useMemo(() => {
    if (!w || !h) return { paths: [] as string[], cx: 0, cy: 0 };

    // 投影：視野半高（世界單位）→ 每世界單位幾 px
    const halfHeightWorld = CAMERA_Z * Math.tan(((FOV_DEG / 2) * Math.PI) / 180);
    const pxPerWorld = h / 2 / halfHeightWorld;
    const cx = w / 2 + EARTH_X_WORLD * pxPerWorld;
    const cy = h / 2;
    const R = RIM_WORLD * pxPerWorld;
    const A = pull * R;
    const S = reach * R;
    const rim = R * 1.01;

    // 每個網格點朝地球中心拉：外圍用高斯衰減，進到半徑內就貼在大氣邊緣
    // → 線不會穿過地球（點雲半透明，穿過去會透出來），視覺上像網格包住球體
    const warp = (x: number, y: number): [number, number] => {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) return [x, y];
      let nd = d > R ? d - A * Math.exp(-(((d - R) / S) ** 2)) : rim;
      if (nd < rim) nd = rim;
      const k = nd / d;
      return [cx + dx * k, cy + dy * k];
    };

    const step = 10;
    const x0 = Math.floor((fadeStart * w - cell) / cell) * cell;
    const x1 = w + cell;
    const y0 = -cell;
    const y1 = h + cell;
    const out: string[] = [];

    for (let x = x0; x <= x1; x += cell) {
      let d = "";
      for (let y = y0; y <= y1; y += step) {
        const [px, py] = warp(x, y);
        d += `${d ? " L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`;
      }
      out.push(d);
    }
    for (let y = 0; y <= y1; y += cell) {
      let d = "";
      for (let x = x0; x <= x1; x += step) {
        const [px, py] = warp(x, y);
        d += `${d ? " L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`;
      }
      out.push(d);
    }
    return { paths: out, cx, cy };
  }, [w, h, cell, pull, reach, fadeStart]);

  if (!w || !h) return null;

  // 兩層 mask 取交集：左側線性漸淡（讓位給文字）× 以地球為中心的橢圓暈影（不佔滿版面）
  const mask =
    `linear-gradient(to right, transparent ${fadeStart * 100}%, #000 ${fadeEnd * 100}%), ` +
    `radial-gradient(ellipse 62% 78% at ${(cx / w) * 100}% ${(cy / h) * 100}%, #000 42%, transparent 100%)`;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      <style>{`
        @keyframes gravity-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.012); }
        }
        .gravity-grid-breathe { animation: gravity-breathe 9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gravity-grid-breathe { animation: none; }
        }
      `}</style>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="gravity-grid-breathe"
        style={{
          display: "block",
          color: "var(--fg)",
          opacity,
          maskImage: mask,
          WebkitMaskImage: mask,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        <g fill="none" stroke="currentColor" strokeWidth={0.6} strokeLinejoin="round">
          {paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </svg>
    </div>
  );
}
